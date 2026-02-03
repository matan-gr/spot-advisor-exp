
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  AppState, 
  TargetShape, 
  CapacityAdvisorResponse, 
  LogEntry, 
  DebugData, 
  NetworkLogEntry,
  Toast,
  HistoryEntry,
  ScenarioConfig,
  ScenarioResult
} from '../types';
import { 
  REGIONS, 
  REGION_CONFIG as STATIC_REGION_CONFIG, 
  MACHINE_TYPES as STATIC_MACHINE_TYPES, 
  MachineTypeOption,
  REGION_METADATA 
} from '../config';
import { fetchAllZonesCapacity, fetchAvailableRegions, fetchMachineTypes, validateTokenScopes } from '../services/apiService';
import { generateMockRecommendationsWithShape } from '../services/simulationEngine';
import { 
  getFriendlyErrorMessage, 
  buildCapacityAdvisorRequest, 
  generateUUID 
} from '../utils';
import { downloadFile, generateCSV, generateHTML, generatePDF, generateJSON } from '../export';
import { fetchHistoryFromGCS, saveHistoryToGCS } from '../services/storageService';

const INITIAL_DEBUG: DebugData = {
  request: null,
  response: null,
  geminiDebug: null,
  startTime: null,
  endTime: null,
  status: 'idle',
  mode: 'real',
  logs: [],
  network: []
};

const INITIAL_STATE: AppState = {
  project: 'gcp-capacity-planning',
  region: 'us-central1',
  zones: [],
  selectedMachineType: 'n2-standard-4',
  selectedFamilies: ['All'],
  size: 5,
  targetShape: TargetShape.ANY,
  loading: false,
  groundingLoading: false,
  result: null,
  error: null,
  debugData: INITIAL_DEBUG,
  showDebug: false,
  mockMode: false,
  accessToken: '',
  searchTerm: '',
  darkMode: false,
  enableGemini: true,
  groundingMetadata: null,
  toasts: [],
  validationErrors: {},
  history: [],
  comparisonMode: false,
  selectedComparisonIds: [],
  baselineRunId: null,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  tokenWarning: null,
  workloadProfile: 'generic',
  growthScenario: 'steady',
  scenarios: [],
  batchResults: [],
  lastRunConfig: null
};

// GCP Project ID Regex: 6-30 chars, lowercase, digits, hyphens.
const PROJECT_ID_REGEX = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export const useCapacityLogic = () => {
  // --- State Initialization ---
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('appState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const safeFamilies = Array.isArray(parsed.selectedFamilies) ? parsed.selectedFamilies : ['All'];
        
        // Apply theme immediately
        if (parsed.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return { 
            ...INITIAL_STATE, 
            ...parsed, 
            selectedFamilies: safeFamilies,
            loading: false, 
            groundingLoading: false, 
            result: null, 
            error: null, 
            debugData: INITIAL_DEBUG,
            accessToken: '', // Don't persist sensitive tokens
            searchTerm: '',
            toasts: [],
            validationErrors: {},
            // Ensure enableGemini defaults to true if not explicitly saved as false
            enableGemini: parsed.enableGemini !== undefined ? parsed.enableGemini : true,
            history: Array.isArray(parsed.history) ? parsed.history : [],
            comparisonMode: false,
            selectedComparisonIds: [],
            baselineRunId: null
        };
      } catch (e) { return INITIAL_STATE; }
    }
    
    // Fallback to System Preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) {
        document.documentElement.classList.add('dark');
    }

    return { ...INITIAL_STATE, darkMode: systemPrefersDark };
  });

  const [availableRegions, setAvailableRegions] = useState<string[]>(REGIONS);
  const [availableMachineTypes, setAvailableMachineTypes] = useState<MachineTypeOption[]>(STATIC_MACHINE_TYPES);
  const [regionConfig, setRegionConfig] = useState<Record<string, string[]>>(STATIC_REGION_CONFIG);
  
  const [isFetchingRegions, setIsFetchingRegions] = useState(false);
  const [isFetchingMachineTypes, setIsFetchingMachineTypes] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTimeRef = useRef<number | null>(null);
  const staleToastShownRef = useRef<boolean>(false);
  const isFirstRender = useRef(true);

  // --- Helpers ---
  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setState(prev => ({
      ...prev,
      debugData: {
        ...prev.debugData,
        logs: [...prev.debugData.logs, { timestamp: new Date().toISOString(), level, message }]
      }
    }));
  }, []);

  const addNetworkLog = useCallback((entry: NetworkLogEntry) => {
    setState(prev => ({
      ...prev,
      debugData: {
        ...prev.debugData,
        network: [...prev.debugData.network, entry]
      }
    }));
  }, []);

  const addToast = useCallback((type: Toast['type'], title: string, message: string, duration?: number) => {
    const newToast: Toast = {
        id: generateUUID(),
        type,
        title,
        message,
        duration: duration || 6000
    };
    setState(prev => ({ ...prev, toasts: [...prev.toasts, newToast] }));
  }, []);

  const removeToast = useCallback((id: string) => {
      setState(prev => ({ ...prev, toasts: prev.toasts.filter(t => t.id !== id) }));
  }, []);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => {
        const newErrors = { ...prev.validationErrors };
        if (updates.project) delete newErrors.project;
        if (updates.region) delete newErrors.region;
        if (updates.selectedMachineType) delete newErrors.machineType;
        if (updates.accessToken) delete newErrors.accessToken;
        
        let nextState = { ...prev, ...updates, validationErrors: newErrors };
        
        return nextState;
    });
  }, []);

  // --- Effects ---

  // Check Data Freshness (Stale Data Alert - 2 Minutes)
  useEffect(() => {
    const checkStaleness = () => {
      if (!state.result || !lastFetchTimeRef.current) return;
      const elapsed = Date.now() - lastFetchTimeRef.current;
      const STALE_THRESHOLD = 120 * 1000;
      
      if (elapsed > STALE_THRESHOLD && !staleToastShownRef.current) {
         addToast(
             'warning', 
             'Data Freshness Alert', 
             'The displayed capacity data is over 2 minutes old. We recommend refreshing the analysis for the most accurate availability.',
             60000
         );
         staleToastShownRef.current = true;
      }
    };

    const interval = setInterval(checkStaleness, 15000);
    return () => clearInterval(interval);
  }, [state.result, addToast]);



  // Persist State & Theme
  useEffect(() => {
    const configToSave = {
        project: state.project,
        region: state.region,
        zones: state.zones,
        selectedMachineType: state.selectedMachineType,
        selectedFamilies: state.selectedFamilies,
        size: state.size,
        targetShape: state.targetShape,
        mockMode: state.mockMode,
        darkMode: state.darkMode,
        enableGemini: state.enableGemini,
        history: state.history
    };
    localStorage.setItem('appState', JSON.stringify(configToSave));
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.project, state.region, state.zones, state.selectedMachineType, state.selectedFamilies, state.size, state.targetShape, state.mockMode, state.darkMode, state.enableGemini, state.history]);

  // Reset results when switching modes
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    
    setState(prev => ({
        ...prev,
        result: null,
        error: null,
        groundingMetadata: null,
        loading: false,
        groundingLoading: false,
        debugData: { 
            ...INITIAL_DEBUG, 
            mode: prev.mockMode ? 'mock' : 'real' 
        }
    }));
  }, [state.mockMode]);

  // --- GCS History Sync ---

  // Load History on Auth
  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
        if (!state.accessToken || state.mockMode || !state.project) return;
        
        // Skip if token is obviously invalid (too short)
        if (state.accessToken.length < 10) return;

        updateState({ isSyncing: true, syncError: null });
        
        try {
            const remoteHistory = await fetchHistoryFromGCS(state.accessToken, state.project, addNetworkLog);
            
            if (mounted && remoteHistory) {
                // Merge strategy: Combine and deduplicate by ID
                setState(prev => {
                    const existingIds = new Set(prev.history.map(h => h.id));
                    const newEntries = remoteHistory.filter(h => !existingIds.has(h.id));
                    
                    if (newEntries.length === 0) {
                        return { ...prev, isSyncing: false, lastSyncTime: new Date().toISOString() };
                    }

                    const merged = [...newEntries, ...prev.history].sort((a, b) => 
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    
                    return { 
                        ...prev, 
                        history: merged,
                        isSyncing: false,
                        lastSyncTime: new Date().toISOString()
                    };
                });
                addLog('info', `Synced ${remoteHistory.length} history entries from GCS.`);
            } else if (mounted) {
                updateState({ isSyncing: false });
            }
        } catch (e) {
            if (mounted) {
                updateState({ isSyncing: false, syncError: 'Failed to load history' });
                addLog('error', 'Failed to load history from GCS.');
            }
        }
    };

    // Debounce load to avoid spamming on typing
    const timer = setTimeout(loadHistory, 1500);
    return () => { mounted = false; clearTimeout(timer); };
  }, [state.accessToken, state.project, state.mockMode, addLog, addNetworkLog]);

  // Save History on Change
  useEffect(() => {
      if (!state.accessToken || state.mockMode || !state.project || state.history.length === 0) return;
      
      // Skip if token is obviously invalid
      if (state.accessToken.length < 10) return;

      const saveHistory = async () => {
          // Don't set isSyncing here to avoid UI flicker, just do it in background
          // But we do want to know if it's saving...
          // Let's set it only if it takes time? No, keep it simple.
          
          try {
              const success = await saveHistoryToGCS(state.accessToken, state.project, state.history, addNetworkLog);
              if (success) {
                  updateState({ lastSyncTime: new Date().toISOString(), syncError: null });
                  addLog('info', 'History saved to GCS.');
              } else {
                  updateState({ syncError: 'Failed to save to GCS' });
              }
          } catch (e) {
              updateState({ syncError: 'Save failed' });
          }
      };

      const timer = setTimeout(saveHistory, 3000); // Debounce save
      return () => clearTimeout(timer);
  }, [state.history, state.accessToken, state.project, state.mockMode, addLog, addNetworkLog]);

  // Validate Token Scopes
  useEffect(() => {
      if (!state.accessToken || state.mockMode || state.accessToken.length < 10) {
          if (state.tokenWarning) updateState({ tokenWarning: null });
          return;
      }

      const validate = async () => {
          const { valid, warning } = await validateTokenScopes(state.accessToken, addNetworkLog);
          if (!valid) {
              // Don't error immediately, just warn
              updateState({ tokenWarning: warning || 'Token validation failed' });
          } else if (warning) {
              updateState({ tokenWarning: warning });
          } else {
              updateState({ tokenWarning: null });
          }
      };

      const timer = setTimeout(validate, 1000);
      return () => clearTimeout(timer);
  }, [state.accessToken, state.mockMode, addNetworkLog]);

  // Fetch Regions
  useEffect(() => {
    let mounted = true;
    const loadRegions = async () => {
      if (!state.accessToken || state.mockMode || !state.project) {
        setAvailableRegions(REGIONS);
        setRegionConfig(STATIC_REGION_CONFIG);
        return;
      }
      setIsFetchingRegions(true);
      try {
        const dynamicRegionConfig = await fetchAvailableRegions(state.accessToken, state.project, addNetworkLog);
        if (mounted && Object.keys(dynamicRegionConfig).length > 0) {
          const regions = Object.keys(dynamicRegionConfig).sort();
          setAvailableRegions(regions);
          setRegionConfig(dynamicRegionConfig);
          addLog('info', `Fetched ${regions.length} regions dynamically.`);
        }
      } catch (e) {
        if (mounted) {
           addLog('warn', 'Could not fetch dynamic regions. Using static fallback.');
           setAvailableRegions(REGIONS);
        }
      } finally {
        if (mounted) setIsFetchingRegions(false);
      }
    };
    const timer = setTimeout(loadRegions, 100);
    return () => { mounted = false; clearTimeout(timer); };
  }, [state.accessToken, state.project, state.region, state.mockMode, addLog, addNetworkLog]);

  // Fetch Machine Types
  useEffect(() => {
    let mounted = true;
    const loadMachineTypes = async () => {
        if (!state.accessToken || state.mockMode || !state.project || !state.region) {
            setAvailableMachineTypes(STATIC_MACHINE_TYPES);
            return;
        }
        const zones = regionConfig[state.region];
        if (!zones || zones.length === 0) {
             setAvailableMachineTypes(STATIC_MACHINE_TYPES);
             return;
        }
        setIsFetchingMachineTypes(true);
        try {
            const types = await fetchMachineTypes(state.accessToken, state.project, zones[0], addNetworkLog);
            if (mounted && types.length > 0) {
                setAvailableMachineTypes(types);
                addLog('info', `Fetched ${types.length} machine types.`);
            } else if (mounted) {
                 setAvailableMachineTypes(STATIC_MACHINE_TYPES);
            }
        } catch (e) {
            if (mounted) {
                addLog('warn', 'Could not fetch dynamic types. Using static fallback.');
                setAvailableMachineTypes(STATIC_MACHINE_TYPES);
            }
        } finally {
            if (mounted) setIsFetchingMachineTypes(false);
        }
    };
    const timer = setTimeout(loadMachineTypes, 200);
    return () => { mounted = false; clearTimeout(timer); }
  }, [state.accessToken, state.project, state.region, regionConfig, state.mockMode, addLog, addNetworkLog]);

  // --- Actions ---

  // --- Scenario Management ---
  const addScenario = useCallback(() => {
      // Validate required fields
      if (!state.project || !state.region || !state.selectedMachineType || !state.size) {
          addToast('error', 'Incomplete Configuration', 'Please specify Project ID, Region, Machine Type, and Size.');
          return;
      }

      if (state.size <= 0) {
          addToast('error', 'Invalid Size', 'Target size must be greater than 0.');
          return;
      }

      // Check for duplicates
      const isDuplicate = state.scenarios.some(s => 
          s.project === state.project &&
          s.region === state.region &&
          s.machineType === state.selectedMachineType &&
          s.size === state.size &&
          s.targetShape === state.targetShape &&
          s.workloadProfile === state.workloadProfile &&
          s.growthScenario === state.growthScenario
      );

      if (isDuplicate) {
          addToast('warning', 'Duplicate Configuration', 'This scenario is already in the queue.');
          return;
      }

      const newScenario: ScenarioConfig = {
          id: generateUUID(),
          name: `${state.region} - ${state.selectedMachineType} (${state.size})`,
          project: state.project,
          region: state.region,
          zones: state.zones,
          machineType: state.selectedMachineType,
          size: state.size,
          targetShape: state.targetShape,
          workloadProfile: state.workloadProfile,
          growthScenario: state.growthScenario
      };
      
      setState(prev => ({
          ...prev,
          scenarios: [...prev.scenarios, newScenario],
          // Clear validation errors if any, as we just "saved" a valid config (assuming validation passed before calling this)
      }));
      
      addToast('success', 'Scenario Added', 'Configuration added to batch queue.');
  }, [state, addToast]);

  const removeScenario = useCallback((id: string) => {
      setState(prev => ({
          ...prev,
          scenarios: prev.scenarios.filter(s => s.id !== id)
      }));
  }, []);

  // Configuration Drift Detection
  const isConfigDrifted = useMemo(() => {
      if (!state.lastRunConfig) return false;
      if (state.loading) return false; // Don't show drift while running

      const currentConfig = {
          project: state.project,
          region: state.region,
          zones: state.zones,
          selectedMachineType: state.selectedMachineType,
          size: state.size,
          targetShape: state.targetShape,
          workloadProfile: state.workloadProfile,
          growthScenario: state.growthScenario,
          scenarios: state.scenarios
      };

      const last = state.lastRunConfig;
      
      // Deep comparison for scenarios array
      const scenariosChanged = JSON.stringify(currentConfig.scenarios) !== JSON.stringify(last.scenarios);
      
      // Comparison for zones array
      const zonesChanged = JSON.stringify(currentConfig.zones.sort()) !== JSON.stringify(last.zones.sort());

      return (
          currentConfig.project !== last.project ||
          currentConfig.region !== last.region ||
          zonesChanged ||
          currentConfig.selectedMachineType !== last.selectedMachineType ||
          currentConfig.size !== last.size ||
          currentConfig.targetShape !== last.targetShape ||
          currentConfig.workloadProfile !== last.workloadProfile ||
          currentConfig.growthScenario !== last.growthScenario ||
          scenariosChanged
      );
  }, [state]);

  // Toast for Drift
  const driftToastShownRef = useRef(false);
  useEffect(() => {
      if (isConfigDrifted && !driftToastShownRef.current) {
          addToast('info', 'Configuration Changed', 'Your settings have changed since the last run. Click "Run Analysis" to update results.');
          driftToastShownRef.current = true;
      } else if (!isConfigDrifted) {
          driftToastShownRef.current = false;
      }
  }, [isConfigDrifted, addToast]);

  const runBatchAnalysis = async () => {
    // If no scenarios, treat current draft as one
    let scenariosToRun = state.scenarios;
    if (scenariosToRun.length === 0) {
        // Validate Draft First
        // ... (Reuse existing validation logic, maybe extract it)
        // For now, let's assume the button is disabled if invalid, or we do a quick check here.
        // Actually, let's just reuse the validation logic inside the loop or before.
        
        // Quick fix: If no scenarios, add the current one.
        scenariosToRun = [{
            id: generateUUID(),
            name: 'Quick Run',
            project: state.project,
            region: state.region,
            zones: state.zones,
            machineType: state.selectedMachineType,
            size: state.size,
            targetShape: state.targetShape,
            workloadProfile: state.workloadProfile,
            growthScenario: state.growthScenario
        }];
    }

    if (state.loading) return;

    // Security Check for Real Mode
    if (!state.mockMode) {
        if (!state.accessToken) {
            addToast('error', 'Authentication Required', 'Access Token is missing. Please provide a valid token for Real Mode.');
            return;
        }
        // Warn but do not block if token validation failed
        if (state.tokenWarning) {
            addToast('warning', 'Token Warning', 'Proceeding with potentially invalid token. Analysis may fail.');
        }
    }

    // Validation Check for ALL scenarios (or at least the draft if used)
    // ...

    abortControllerRef.current = new AbortController();
    
    // Initialize Batch Results
    const initialResults: ScenarioResult[] = scenariosToRun.map(s => ({
        ...s,
        status: 'pending'
    }));

    // Save Run Config
    const currentRunConfig = {
          project: state.project,
          region: state.region,
          zones: state.zones,
          selectedMachineType: state.selectedMachineType,
          size: state.size,
          targetShape: state.targetShape,
          workloadProfile: state.workloadProfile,
          growthScenario: state.growthScenario,
          scenarios: state.scenarios
    };

    updateState({ 
        loading: true, 
        batchResults: initialResults,
        result: null, // Clear legacy single result
        error: null,
        lastRunConfig: currentRunConfig
    });

    // Execute in Parallel with Concurrency Limit
    const CONCURRENCY_LIMIT = 5;
    
    // Helper for concurrency
    const runWithConcurrency = async (
        items: typeof scenariosToRun, 
        concurrency: number, 
        fn: (scenario: typeof scenariosToRun[0], index: number) => Promise<void>
    ) => {
        let index = 0;
        const next = async (): Promise<void> => {
            if (index >= items.length) return;
            const i = index++;
            await fn(items[i], i);
            await next();
        };
        const workers = Array(Math.min(items.length, concurrency)).fill(null).map(() => next());
        await Promise.all(workers);
    };

    await runWithConcurrency(scenariosToRun, CONCURRENCY_LIMIT, async (scenario, index) => {
        // Update status to loading
        setState(prev => {
            const newResults = [...prev.batchResults];
            if (newResults[index]) newResults[index].status = 'loading';
            return { ...prev, batchResults: newResults };
        });

        try {
            // Build Request
            const requestState: AppState = { ...state, ...scenario, selectedMachineType: scenario.machineType }; 
            const requestBody = buildCapacityAdvisorRequest(requestState);
            const requestUrl = `https://compute.googleapis.com/compute/alpha/projects/${scenario.project}/regions/${scenario.region}/advice/capacity`;

            // Update Debug Data Start (for the first one or last one, to show activity)
            setState(prev => {
                const currentBatchRequests = prev.debugData.batchRequests || [];
                const newEntry: any = {
                    scenarioId: scenario.id,
                    scenarioName: scenario.name,
                    request: {
                        url: requestUrl,
                        method: 'POST',
                        body: requestBody,
                        curl: `curl -X POST "${requestUrl}" ...`
                    },
                    response: null,
                    status: 'loading',
                    timestamp: new Date().toISOString()
                };
                
                // Update or Add
                const existingIdx = currentBatchRequests.findIndex(r => r.scenarioId === scenario.id);
                let updatedBatchRequests = [...currentBatchRequests];
                if (existingIdx !== -1) {
                    updatedBatchRequests[existingIdx] = newEntry;
                } else {
                    updatedBatchRequests.push(newEntry);
                }

                return {
                    ...prev,
                    debugData: {
                        ...prev.debugData,
                        status: 'running',
                        startTime: prev.debugData.startTime || new Date().toISOString(),
                        batchRequests: updatedBatchRequests,
                        // Keep single request view for the latest one
                        request: newEntry.request
                    }
                };
            });
            
            let response: CapacityAdvisorResponse;
            
            if (state.mockMode) {
                await new Promise(r => setTimeout(r, 600 + Math.random() * 1000)); // Variable latency
                const machineDetails = availableMachineTypes.find(m => m.id === scenario.machineType) || STATIC_MACHINE_TYPES.find(m => m.id === scenario.machineType);
                response = generateMockRecommendationsWithShape(scenario.region, scenario.machineType, machineDetails, scenario.size, scenario.targetShape);
            } else {
                response = await fetchAllZonesCapacity(state.accessToken, scenario.project, scenario.region, requestState, abortControllerRef.current?.signal, addNetworkLog);
            }

            // Success
            setState(prev => {
                const newResults = [...prev.batchResults];
                const idx = newResults.findIndex(r => r.id === scenario.id);
                if (idx !== -1) {
                    newResults[idx] = {
                        ...newResults[idx],
                        status: 'success',
                        response: response
                    };
                }
                
                // Update Debug Data Success
                const currentBatchRequests = prev.debugData.batchRequests || [];
                const updatedBatchRequests = currentBatchRequests.map(r => 
                    r.scenarioId === scenario.id 
                    ? { ...r, status: 'success' as const, response: response } 
                    : r
                );

                return { 
                    ...prev, 
                    batchResults: newResults,
                    debugData: {
                        ...prev.debugData,
                        status: 'running', // Keep running until all done
                        endTime: new Date().toISOString(), // Update last activity
                        batchRequests: updatedBatchRequests,
                        response: response, // Show latest response in single view
                        summary: `Analyzed ${updatedBatchRequests.filter(r => r.status === 'success').length}/${scenariosToRun.length} scenarios`
                    }
                };
            });

        } catch (error: any) {
            // Error
            setState(prev => {
                const newResults = [...prev.batchResults];
                const idx = newResults.findIndex(r => r.id === scenario.id);
                if (idx !== -1) {
                    newResults[idx] = {
                        ...newResults[idx],
                        status: 'error',
                        errorDetails: error.message || 'Failed'
                    };
                }
                
                // Update Debug Data Error
                const currentBatchRequests = prev.debugData.batchRequests || [];
                const updatedBatchRequests = currentBatchRequests.map(r => 
                    r.scenarioId === scenario.id 
                    ? { ...r, status: 'error' as const, error: error.message } 
                    : r
                );

                return { 
                    ...prev, 
                    batchResults: newResults,
                    debugData: {
                        ...prev.debugData,
                        status: 'running',
                        endTime: new Date().toISOString(),
                        batchRequests: updatedBatchRequests,
                        summary: `Error analyzing ${scenario.machineType}: ${error.message}`
                    }
                };
            });
        }
    });
    
    updateState({ loading: false });
    addToast('success', 'Batch Complete', `Finished analyzing ${scenariosToRun.length} scenarios.`);
  };

  // Replace handleSearch with runBatchAnalysis (or keep handleSearch as a wrapper)
  const handleSearch = runBatchAnalysis;

  /**
   * Retries a specific failed scenario from the batch results.
   */
  const retryScenario = useCallback(async (scenarioId: string) => {
      const scenarioIndex = state.batchResults.findIndex(r => r.id === scenarioId);
      if (scenarioIndex === -1) return;

      const scenario = state.batchResults[scenarioIndex];
      if (scenario.status === 'loading') return;

      // Update status to loading
      setState(prev => {
          const newResults = [...prev.batchResults];
          newResults[scenarioIndex] = { ...newResults[scenarioIndex], status: 'loading', errorDetails: undefined };
          return { ...prev, batchResults: newResults };
      });

      try {
          // Re-run logic (simplified version of runBatchAnalysis for single item)
          const requestState: AppState = { ...state, ...scenario, selectedMachineType: scenario.machineType };
          let response: CapacityAdvisorResponse;

          if (state.mockMode) {
              await new Promise(r => setTimeout(r, 1000));
              const machineDetails = availableMachineTypes.find(m => m.id === scenario.machineType) || STATIC_MACHINE_TYPES.find(m => m.id === scenario.machineType);
              response = generateMockRecommendationsWithShape(scenario.region, scenario.machineType, machineDetails, scenario.size, scenario.targetShape);
          } else {
               // Ensure token exists for real mode
               if (!state.accessToken) throw new Error("Missing Access Token");
               response = await fetchAllZonesCapacity(state.accessToken, scenario.project, scenario.region, requestState, undefined, addNetworkLog);
          }

          setState(prev => {
              const newResults = [...prev.batchResults];
              newResults[scenarioIndex] = { ...newResults[scenarioIndex], status: 'success', response };
              return { ...prev, batchResults: newResults };
          });
          
          addToast('success', 'Retry Successful', `Scenario ${scenario.name} updated.`);

      } catch (error: any) {
          setState(prev => {
              const newResults = [...prev.batchResults];
              newResults[scenarioIndex] = { ...newResults[scenarioIndex], status: 'error', errorDetails: error.message };
              return { ...prev, batchResults: newResults };
          });
          addToast('error', 'Retry Failed', error.message);
      }
  }, [state, availableMachineTypes, addNetworkLog, addToast]);

  /**
   * Full Application Reset
   * Clears all state, history, and caches to factory defaults.
   */
  const resetApplication = useCallback(() => {
      if (window.confirm("Are you sure you want to reset the application? This will clear all history, scenarios, and settings.")) {
          localStorage.removeItem('appState');
          setState({ ...INITIAL_STATE, darkMode: state.darkMode }); // Keep theme preference
          addToast('info', 'Application Reset', 'All state has been cleared.');
      }
  }, [state.darkMode, addToast]);

  const toggleFamily = useCallback((family: string) => {
    if (state.result) {
        addToast(
            'info',
            'Filter Changed',
            'Machine family filter updated. Previous results cleared to reflect new criteria.',
            5000
        );
    }

    setState(prev => {
        let newFamilies = [...prev.selectedFamilies];
        const shouldReset = !!prev.result;

        if (family === 'All') {
            return { 
                ...prev, 
                selectedFamilies: ['All'], 
                selectedMachineType: '',
                result: shouldReset ? null : prev.result,
                error: shouldReset ? null : prev.error,
                groundingMetadata: shouldReset ? null : prev.groundingMetadata
            };
        }

        newFamilies = newFamilies.filter(f => f !== 'All');
        if (newFamilies.includes(family)) newFamilies = newFamilies.filter(f => f !== family);
        else newFamilies.push(family);
        if (newFamilies.length === 0) newFamilies = ['All'];
        
        return { 
            ...prev, 
            selectedFamilies: newFamilies, 
            selectedMachineType: '',
            result: shouldReset ? null : prev.result,
            error: shouldReset ? null : prev.error,
            groundingMetadata: shouldReset ? null : prev.groundingMetadata
        };
    });
  }, [state.result, addToast]);

  const handleExport = useCallback((type: 'csv' | 'html' | 'pdf' | 'json') => {
    if (!state.result) return;
    if (type === 'csv') downloadFile(generateCSV(state.result, state), `capacity-${state.project}.csv`, 'text/csv');
    else if (type === 'html') downloadFile(generateHTML(state.result, state, state.groundingMetadata), `capacity-${state.project}.html`, 'text/html');
    else if (type === 'pdf') generatePDF(state.result, state, state.groundingMetadata);
    else if (type === 'json') downloadFile(generateJSON(state.result, state, state.groundingMetadata), `capacity-${state.project}.json`, 'application/json');
  }, [state.result, state.project, state.groundingMetadata]);

  const clearResults = useCallback(() => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      lastFetchTimeRef.current = null;
      staleToastShownRef.current = false;
      setState(prev => ({
          ...INITIAL_STATE,
          project: prev.project, 
          accessToken: prev.accessToken,
          mockMode: prev.mockMode,
          darkMode: prev.darkMode,
          region: INITIAL_STATE.region,
          selectedMachineType: INITIAL_STATE.selectedMachineType,
          selectedFamilies: INITIAL_STATE.selectedFamilies,
          size: INITIAL_STATE.size,
          targetShape: INITIAL_STATE.targetShape,
          result: null,
          error: null,
          groundingMetadata: null,
          loading: false,
          groundingLoading: false,
          scenarios: [],
          batchResults: []
      }));
      addToast('info', 'Workspace Reset', 'All data has been cleared. You are ready to configure a new analysis.');
  }, [addToast]);

  const filteredMachineTypes = useMemo(() => {
     if (state.selectedFamilies.includes('All')) return availableMachineTypes;
     return availableMachineTypes.filter(type => state.selectedFamilies.includes(type.family));
  }, [availableMachineTypes, state.selectedFamilies]);

  const regionOptions = useMemo(() => {
    return availableRegions.map(id => {
        const meta = REGION_METADATA[id];
        return {
            id,
            name: meta?.name || id,
            continent: meta?.continent || 'Other'
        };
    });
  }, [availableRegions]);

  const handleZonesChange = useCallback((zones: string[]) => {
      updateState({ zones });
  }, [updateState]);

  const toggleComparisonMode = useCallback(() => {
      setState(prev => ({ ...prev, comparisonMode: !prev.comparisonMode }));
  }, []);

  const selectRunForComparison = useCallback((id: string) => {
      setState(prev => {
          const currentSelected = prev.selectedComparisonIds;
          if (currentSelected.includes(id)) {
              return { ...prev, selectedComparisonIds: currentSelected.filter(i => i !== id) };
          }
          if (currentSelected.length >= 3) {
              addToast('warning', 'Comparison Limit Reached', 'You can compare up to 3 runs at a time. Please deselect a run to add another.');
              return prev;
          }
          return { ...prev, selectedComparisonIds: [...currentSelected, id] };
      });
  }, [addToast]);

  const deleteRun = useCallback((id: string) => {
      setState(prev => ({
          ...prev,
          history: prev.history.filter(h => h.id !== id),
          selectedComparisonIds: prev.selectedComparisonIds.filter(i => i !== id),
          baselineRunId: prev.baselineRunId === id ? null : prev.baselineRunId
      }));
  }, []);

  const setBaseline = useCallback((id: string | null) => {
      setState(prev => ({ ...prev, baselineRunId: id }));
  }, []);

  return {
    state,
    updateState,
    handleSearch,
    handleExport,
    clearResults,
    toggleFamily,
    handleZonesChange,
    filteredMachineTypes,
    availableRegions,
    availableMachineTypes,
    isFetchingRegions,
    isFetchingMachineTypes,
    regionOptions,
    machineDetails: availableMachineTypes.find(m => m.id === state.selectedMachineType) || STATIC_MACHINE_TYPES.find(m => m.id === state.selectedMachineType),
    removeToast,
    regionConfig,
    toggleComparisonMode,
    selectRunForComparison,
    deleteRun,
    setBaseline,
    addScenario,
    removeScenario,
    addToast,
    retryScenario,
    resetApplication,
    isConfigDrifted
  };
};
