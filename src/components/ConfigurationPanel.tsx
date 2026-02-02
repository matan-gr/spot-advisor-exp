
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { MACHINE_FAMILIES, MachineTypeOption } from '../config';
import { AppState, TargetShape, Toast } from '../types';
import Autocomplete from './Autocomplete';
import RegionAutocomplete, { RegionOption } from './RegionAutocomplete';
import MachineTypeInfo from './MachineTypeInfo';
import { motion, AnimatePresence } from 'framer-motion';
import { DebouncedInput, DebouncedTextarea } from './DebouncedInputs';

interface ConfigurationPanelProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  filteredMachineTypes: MachineTypeOption[];
  regionOptions: RegionOption[];
  machineDetails: MachineTypeOption | undefined;
  toggleFamily: (family: string) => void;
  isFetchingRegions: boolean;
  isFetchingMachineTypes: boolean;
  onSearch: () => void;
  regionConfig: Record<string, string[]>;
  onZonesChange: (zones: string[]) => void;
  addScenario: () => void;
  removeScenario: (id: string) => void;
  addToast: (type: Toast['type'], title: string, message: string, duration?: number) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = React.memo(({
  state,
  updateState,
  filteredMachineTypes,
  regionOptions,
  machineDetails,
  toggleFamily,
  isFetchingRegions,
  isFetchingMachineTypes,
  onSearch,
  regionConfig,
  onZonesChange,
  addScenario,
  removeScenario,
  addToast
}) => {
  const [isShapeOpen, setIsShapeOpen] = useState(false);
  const [dismissedProjectError, setDismissedProjectError] = useState(false);
  const shapeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Track if configuration has changed since last run
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastRunConfigRef = useRef<string>('');
  const wasLoadingRef = useRef(state.loading);

  // Generate a signature for the current configuration
  const getConfigSignature = (s: AppState) => {
    return JSON.stringify({
      project: s.project,
      region: s.region,
      zones: s.zones,
      machineType: s.selectedMachineType,
      size: s.size,
      targetShape: s.targetShape,
      workloadProfile: s.workloadProfile,
      growthScenario: s.growthScenario
    });
  };

  // 1. Capture the "Run Config" when a run completes (loading -> false, result exists)
  useEffect(() => {
      if (wasLoadingRef.current && !state.loading && state.result) {
          lastRunConfigRef.current = getConfigSignature(state);
          setHasUnsavedChanges(false);
      }
      // Also initialize if we have a result on mount (e.g. from localStorage) and no baseline yet
      if (!wasLoadingRef.current && !state.loading && state.result && !lastRunConfigRef.current) {
          lastRunConfigRef.current = getConfigSignature(state);
      }
      wasLoadingRef.current = state.loading;
  }, [state.loading, state.result, state.project, state.region, state.zones, state.selectedMachineType, state.size, state.targetShape, state.workloadProfile, state.growthScenario]);

  // 2. Detect changes against the baseline
  useEffect(() => {
    // If we don't have a baseline (no run yet), don't flag changes
    if (!lastRunConfigRef.current) return;

    const currentConfig = getConfigSignature(state);
    
    if (currentConfig !== lastRunConfigRef.current) {
         if (!hasUnsavedChanges) {
             setHasUnsavedChanges(true);
             addToast(
                 'info',
                 'Configuration Changed',
                 'Workload parameters updated. Run a new analysis to see effects.',
                 3000
             );
         }
    } else {
        // Reverted back to original config
        if (hasUnsavedChanges) setHasUnsavedChanges(false);
    }
  }, [
      state.project, 
      state.region, 
      state.zones, 
      state.selectedMachineType, 
      state.size, 
      state.targetShape, 
      state.workloadProfile, 
      state.growthScenario,
      hasUnsavedChanges // Include this to avoid stale closure if needed, though logic guards against loops
  ]);

  // Reset unsaved changes when a run starts
  useEffect(() => {
      if (state.loading) {
          setHasUnsavedChanges(false);
      }
  }, [state.loading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(event.target as Node)) {
        setIsShapeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset dismissed error when project changes
  useEffect(() => {
    setDismissedProjectError(false);
  }, [state.project]);

  const projectRegex = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
  const isValidProject = !state.project || projectRegex.test(state.project);
  // Show validation if project is not empty OR if there's a validation error
  const showValidation = (state.project.length > 0) || !!state.validationErrors?.project;
  
  // Region Validation
  const selectedRegionZones = state.region ? regionConfig[state.region] : [];
  const hasZones = !state.mockMode && !!state.region && selectedRegionZones && selectedRegionZones.length > 0;
  const showRegionError = !state.mockMode && !!state.region && !isFetchingRegions && (!selectedRegionZones || selectedRegionZones.length === 0);

  const isSearchDisabled = state.loading || (!isValidProject && state.project.length > 0) || showRegionError;

  const shapeOptions = [
    { 
      value: TargetShape.ANY, 
      label: 'Any (Spread or Single)', 
      desc: 'Maximize Availability', 
      icon: <Icons.Layers /> 
    },
    { 
      value: TargetShape.ANY_SINGLE_ZONE, 
      label: 'Single Zone', 
      desc: 'Low Latency', 
      icon: <Icons.Server /> 
    },
  ];

  const selectedShape = shapeOptions.find(o => o.value === state.targetShape) || shapeOptions[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
       
       {/* Main Config Card */}
       <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.4 }}
         className="lg:col-span-8 card-panel p-6 relative"
       >
           <div className="relative z-10">
               <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Icons.Layers size={20} />
                     </div>
                     <div>
                        <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider font-display">Configuration</h3>
                        <p className="text-base font-bold text-slate-900 dark:text-white font-display">
                            Workload Parameters
                        </p>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Left Column: Machine Type */}
                   <div className="space-y-5">
                       <div className="group relative">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Google Cloud Project ID <span className="text-indigo-500">*</span>
                          </label>
                          <div className="relative">
                            <DebouncedInput 
                                type="text" 
                                value={state.project}
                                onCommit={(val) => updateState({ project: val })}
                                className={`input-field
                                    ${showValidation 
                                        ? isValidProject 
                                            ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500' 
                                            : 'border-red-500 focus:border-red-500 bg-red-50/10'
                                        : state.validationErrors?.project
                                            ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                            : ''
                                    }
                                `}
                                placeholder="gcp-project-id"
                            />
                            {showValidation && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {isValidProject ? (
                                        <span className="text-emerald-500 animate-enter"><Icons.Check /></span>
                                    ) : (
                                        <span className="text-red-500 animate-enter"><Icons.Cancel /></span>
                                    )}
                                </div>
                            )}
                          </div>
                          {/* Project ID Error Message */}
                          <AnimatePresence>
                            {showValidation && !isValidProject && !dismissedProjectError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg p-2"
                                >
                                    <div className="text-red-500 shrink-0 mt-0.5"><Icons.Info size={12} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-red-600 dark:text-red-300 font-medium leading-tight">
                                            Invalid Project ID Format.
                                        </p>
                                        <p className="text-[9px] text-red-500 dark:text-red-400 mt-0.5 leading-tight">
                                            Project ID must be 6-30 characters, containing only lowercase letters, digits, and hyphens.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setDismissedProjectError(true)}
                                        className="text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
                                    >
                                        <Icons.Cancel size={12} />
                                    </button>
                                </motion.div>
                            )}
                          </AnimatePresence>
                       </div>
                       
                       <div className="mb-4">
                           <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Machine Family</label>
                           <div className="flex flex-wrap gap-1.5">
                               {MACHINE_FAMILIES.map(family => {
                                   const isSelected = state.selectedFamilies.includes(family);
                                   return (
                                       <button
                                           key={family}
                                           onClick={() => toggleFamily(family)}
                                           className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border ${
                                               isSelected 
                                               ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                                               : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                                           }`}
                                       >
                                           {family}
                                       </button>
                                   );
                               })}
                           </div>
                       </div>

                       <div className="relative z-50">
                          {isFetchingMachineTypes && (
                              <div className="absolute right-0 top-0 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                                  <div className="w-2.5 h-2.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                  Updating...
                              </div>
                          )}
                          <Autocomplete 
                             label="Machine Type"
                             options={filteredMachineTypes}
                             value={state.selectedMachineType}
                             onChange={(id) => updateState({ selectedMachineType: id })}
                             placeholder="Search instance type..."
                             error={state.validationErrors?.machineType}
                          />
                       </div>
                       <MachineTypeInfo details={machineDetails} />
                   </div>
                   
                   {/* Right Column: Region & Shape */}
                   <div className="space-y-5">
                       <div className="group relative z-40">
                           <RegionAutocomplete 
                                label="Target Region"
                                options={regionOptions}
                                value={state.region}
                                onChange={(id) => {
                                    // Clear zones and machine type when region changes to prevent invalid selections
                                    updateState({ region: id, zones: [], selectedMachineType: '' });
                                }}
                                placeholder="Search region..."
                                isLoading={isFetchingRegions}
                                error={state.validationErrors?.region}
                           />
                           {/* Region Error Message */}
                           <AnimatePresence>
                               {showRegionError && (
                                   <motion.div
                                       initial={{ opacity: 0, y: -5 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       exit={{ opacity: 0, y: -5 }}
                                       className="absolute top-full left-0 right-0 mt-2 z-50 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 shadow-lg"
                                   >
                                       <div className="flex items-start gap-2">
                                           <div className="text-amber-500 shrink-0 mt-0.5"><Icons.Info size={14} /></div>
                                           <div>
                                               <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Region Unavailable</p>
                                               <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
                                                   The selected region <strong>{state.region}</strong> appears to have no active zones available for this project. Please verify your region selection.
                                               </p>
                                           </div>
                                       </div>
                                   </motion.div>
                               )}
                           </AnimatePresence>
                       </div>

                       {/* Zone Selection */}
                       {hasZones && (
                           <div className="group relative z-30">
                               <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                   Target Zones <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                               </label>
                               <div className="flex flex-wrap gap-2">
                                   <button
                                       onClick={() => onZonesChange([])}
                                       className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                           state.zones.length === 0
                                           ? 'bg-indigo-600 text-white shadow-sm'
                                           : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                       }`}
                                   >
                                       All Zones (Any)
                                   </button>
                                   {selectedRegionZones.map(zone => {
                                       const isSelected = state.zones.includes(zone);
                                       return (
                                           <button
                                               key={zone}
                                               onClick={() => {
                                                   if (isSelected) {
                                                       onZonesChange(state.zones.filter(z => z !== zone));
                                                   } else {
                                                       onZonesChange([...state.zones, zone]);
                                                   }
                                               }}
                                               className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                   isSelected
                                                   ? 'bg-indigo-600 text-white shadow-sm'
                                                   : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                               }`}
                                           >
                                               {zone}
                                           </button>
                                       );
                                   })}
                               </div>
                           </div>
                       )}
                       
                       <div className="flex flex-col sm:flex-row gap-4">
                          <div className="w-full sm:w-1/2 group relative z-10">
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Instance Count</label>
                              <div className="relative">
                                  <DebouncedInput 
                                    type="number" 
                                    min="1"
                                    max="5000"
                                    value={state.size}
                                    onCommit={(val) => {
                                        let num = parseInt(val);
                                        if (isNaN(num)) num = 1;
                                        if (num > 5000) num = 5000;
                                        if (num < 1) num = 1;
                                        updateState({ size: num });
                                    }}
                                    className="input-field"
                                  />
                              </div>
                          </div>
                          
                          <div className="w-full sm:w-1/2 group relative z-30" ref={shapeDropdownRef}>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Placement Policy</label>
                              <button
                                 onClick={() => setIsShapeOpen(!isShapeOpen)}
                                 className={`w-full input-field flex items-center justify-between ${
                                   isShapeOpen 
                                     ? 'border-indigo-500 ring-1 ring-indigo-500' 
                                     : ''
                                 }`}
                              >
                                 <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-slate-400 shrink-0">{selectedShape.icon}</span>
                                    <span className="truncate text-slate-900 dark:text-white">{selectedShape.label}</span>
                                 </div>
                                 <motion.div 
                                    animate={{ rotate: isShapeOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-slate-400 shrink-0 ml-2"
                                 >
                                    <Icons.ChevronDown />
                                 </motion.div>
                              </button>

                              <AnimatePresence>
                                 {isShapeOpen && (
                                    <motion.div
                                       initial={{ opacity: 0, y: -5, scale: 0.98 }}
                                       animate={{ opacity: 1, y: 0, scale: 1 }}
                                       exit={{ opacity: 0, y: -5, scale: 0.98 }}
                                       transition={{ duration: 0.1, ease: "easeOut" }}
                                       className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5"
                                    >
                                       {shapeOptions.map((option) => {
                                          const isSelected = state.targetShape === option.value;
                                          return (
                                            <div
                                               key={option.value}
                                               onClick={() => {
                                                   updateState({ targetShape: option.value as TargetShape });
                                                   setIsShapeOpen(false);
                                               }}
                                               className={`px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors relative ${
                                                  isSelected 
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                               }`}
                                            >
                                               <div className="flex items-center gap-3">
                                                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                     {option.icon}
                                                  </div>
                                                  <div>
                                                     <p className={`text-sm font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>{option.label}</p>
                                                     <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                                                  </div>
                                               </div>
                                            </div>
                                          );
                                       })}
                                    </motion.div>
                                 )}
                              </AnimatePresence>
                          </div>
                       </div>

                       {/* Simulation Mode Toggle */}
                       <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-3 group hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                           <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg transition-colors ${state.mockMode ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20'}`}>
                                   <Icons.Cpu size={16} />
                               </div>
                               <div>
                                   <p className="text-xs font-bold text-slate-900 dark:text-white">Simulation Mode</p>
                                   <p className="text-[10px] text-slate-500 dark:text-slate-400">Use synthetic data for testing</p>
                               </div>
                           </div>
                           <button
                               type="button"
                               role="switch"
                               aria-checked={state.mockMode}
                               onClick={() => updateState({ mockMode: !state.mockMode })}
                               className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                                   state.mockMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                               }`}
                           >
                               <span
                                   aria-hidden="true"
                                   className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                       state.mockMode ? 'translate-x-5' : 'translate-x-0'
                                   }`}
                               />
                           </button>
                       </div>

                       {/* Predictive AI Settings */}
                       {state.enableGemini && (
                           <div className="mb-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                               <div className="flex items-center gap-2 mb-3">
                                   <Icons.Sparkles size={14} className="text-indigo-500" />
                                   <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">Predictive Context</span>
                               </div>
                               <div className="grid grid-cols-2 gap-3">
                                   <div>
                                       <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Workload Profile</label>
                                       <select 
                                           value={state.workloadProfile}
                                           onChange={(e) => updateState({ workloadProfile: e.target.value as any })}
                                           className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                                       >
                                           <option value="generic">Generic / Mixed</option>
                                           <option value="batch">Batch Processing</option>
                                           <option value="serving">API / Serving</option>
                                           <option value="stateful">Stateful / DB</option>
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Growth Scenario</label>
                                       <select 
                                           value={state.growthScenario}
                                           onChange={(e) => updateState({ growthScenario: e.target.value as any })}
                                           className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                                       >
                                           <option value="steady">Steady State</option>
                                           <option value="daily_peak">Daily Peaks</option>
                                           <option value="viral">Viral / Spiky</option>
                                           <option value="seasonal">Seasonal</option>
                                       </select>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* AI Insights Toggle */}
                       <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                           <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg transition-colors ${state.enableGemini ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20'}`}>
                                   <Icons.Sparkles size={16} />
                               </div>
                               <div>
                                   <p className="text-xs font-bold text-slate-900 dark:text-white">AI Insights</p>
                                   <p className="text-[10px] text-slate-500 dark:text-slate-400">Generate analysis and recommendations</p>
                               </div>
                           </div>
                           <button
                               type="button"
                               role="switch"
                               aria-checked={state.enableGemini}
                               onClick={() => updateState({ enableGemini: !state.enableGemini })}
                               className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                                   state.enableGemini ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                               }`}
                           >
                               <span
                                   aria-hidden="true"
                                   className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                       state.enableGemini ? 'translate-x-5' : 'translate-x-0'
                                   }`}
                               />
                           </button>
                       </div>

                       {/* Add to Queue Button (Strategic Placement) */}
                       <motion.button
                           onClick={addScenario}
                           disabled={isSearchDisabled || state.scenarios.length >= 3}
                           whileHover={!(isSearchDisabled || state.scenarios.length >= 3) ? { scale: 1.02, translateY: -1 } : {}}
                           whileTap={!(isSearchDisabled || state.scenarios.length >= 3) ? { scale: 0.98 } : {}}
                           className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wide text-xs transition-all duration-200 flex justify-center items-center gap-2 shadow-md ${
                               isSearchDisabled || state.scenarios.length >= 3
                               ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500' 
                               : 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 hover:shadow-lg hover:shadow-slate-500/20 dark:hover:shadow-white/10 border border-transparent'
                           }`}
                           title={state.scenarios.length >= 3 ? "Batch queue limit reached (Max 3)" : "Add configuration to queue"}
                       >
                           <Icons.Plus size={16} />
                           {state.scenarios.length >= 3 ? 'Queue Full (Max 3)' : 'Add to Queue'}
                       </motion.button>
                   </div>
               </div>
           </div>
       </motion.div>

       {/* Action Card / Queue Sidebar */}
       <div className="lg:col-span-4 flex flex-col gap-6 h-full">
           
           {/* Batch Queue Card */}
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className={`card-panel flex flex-col overflow-hidden transition-all duration-300 ${state.scenarios.length > 0 ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'}`}
           >
               <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10">
                   <div className="flex items-center gap-2">
                       <div className={`p-1.5 rounded-md ${state.scenarios.length > 0 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                           <Icons.Layers size={14} />
                       </div>
                       <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 font-display">
                           Execution Queue
                       </span>
                   </div>
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${state.scenarios.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                       {state.scenarios.length}
                   </span>
               </div>

               <div className="p-4 flex-1 min-h-[120px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
                   {state.scenarios.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8 opacity-60">
                           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 shadow-inner transform rotate-3">
                               <Icons.Plus size={24} />
                           </div>
                           <div className="space-y-1.5">
                               <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Queue Empty</p>
                               <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                                   Add configurations to compare multiple scenarios side-by-side.
                               </p>
                           </div>
                       </div>
                   ) : (
                       <AnimatePresence mode='popLayout'>
                           {state.scenarios.map((scenario, index) => {
                               // Cycle through theme colors for borders to match ComparisonView
                               const borderColors = [
                                   'border-l-indigo-500', 
                                   'border-l-violet-500', 
                                   'border-l-emerald-500', 
                                   'border-l-amber-500'
                               ];
                               const borderColor = borderColors[index % borderColors.length];
                               
                               return (
                               <motion.div 
                                   key={scenario.id}
                                   layout
                                   initial={{ opacity: 0, scale: 0.95, x: -10 }}
                                   animate={{ opacity: 1, scale: 1, x: 0 }}
                                   exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                   className={`group relative p-3 pl-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-md border-l-4 ${borderColor}`}
                               >
                                   <div className="flex justify-between items-start gap-3">
                                       <div className="flex-1 min-w-0">
                                           <div className="flex items-center gap-2 mb-1.5">
                                               <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                                                   OPT {index + 1}
                                               </span>
                                               <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={scenario.machineType}>
                                                   {scenario.machineType}
                                               </h4>
                                           </div>
                                           <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                               <span className="flex items-center gap-1"><Icons.Globe size={10} className="text-slate-400" /> {scenario.region}</span>
                                               <span className="flex items-center gap-1"><Icons.Server size={10} className="text-slate-400" /> {scenario.size}</span>
                                           </div>
                                       </div>
                                       <button 
                                           onClick={() => removeScenario(scenario.id)}
                                           className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                           title="Remove from queue"
                                       >
                                           <Icons.Trash size={14} />
                                       </button>
                                   </div>
                                   {/* Mini Badge for Profile */}
                                   {scenario.workloadProfile !== 'generic' && (
                                       <div className="absolute -right-1 -top-1">
                                           <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 text-[8px] font-bold border-2 border-white dark:border-slate-950 shadow-sm">
                                               {scenario.workloadProfile[0].toUpperCase()}
                                           </span>
                                       </div>
                                   )}
                               </motion.div>
                               );
                           })}
                       </AnimatePresence>
                   )}
               </div>

               {/* Primary Action Button */}
               <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                   <motion.button 
                      onClick={onSearch}
                      disabled={isSearchDisabled && state.scenarios.length === 0}
                      whileHover={!(isSearchDisabled && state.scenarios.length === 0) ? { scale: 1.02 } : {}}
                      whileTap={!(isSearchDisabled && state.scenarios.length === 0) ? { scale: 0.98 } : {}}
                      className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wide text-xs transition-all duration-200 flex justify-center items-center gap-2 shadow-lg ${
                         state.loading 
                            ? 'bg-slate-800 text-slate-400 cursor-wait' 
                            : state.scenarios.length > 0
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25'
                                : hasUnsavedChanges 
                                   ? 'bg-indigo-600 text-white shadow-indigo-500/40 animate-pulse-ring'
                                   : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                   >
                      {state.loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing Batch...
                          </>
                      ) : state.scenarios.length > 0 ? (
                          <>
                            <Icons.Play size={14} fill="currentColor" /> 
                            Run Batch ({state.scenarios.length})
                          </>
                      ) : (
                          <>
                            <Icons.Zap size={14} className={hasUnsavedChanges ? 'animate-pulse' : ''} />
                            {hasUnsavedChanges ? 'Update Analysis' : 'Run Current Draft'}
                          </>
                      )}
                   </motion.button>
                   {state.scenarios.length === 0 && (
                       <p className="text-[10px] text-center text-slate-400 mt-2">
                           Tip: Add multiple scenarios to compare them.
                       </p>
                   )}
               </div>
           </motion.div>

           {!state.mockMode && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 className="card-panel p-5 relative overflow-hidden border-l-4 border-l-slate-400 dark:border-l-slate-600"
               >
                   <div className="space-y-3">
                       <div className="flex justify-between items-center">
                           <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                <Icons.Key size={12} /> Access Token
                           </label>
                           <div className="flex items-center gap-1">
                               <div className={`w-2 h-2 rounded-full ${state.accessToken ? 'bg-emerald-500' : 'bg-red-500'}`} />
                               <span className="text-[9px] font-medium text-slate-400">
                                   {state.accessToken ? 'Connected' : 'Missing'}
                               </span>
                           </div>
                       </div>

                       <div className="relative">
                           <input 
                               type="password"
                               autoComplete="off"
                               value={state.accessToken}
                               onChange={(e) => updateState({ accessToken: e.target.value })}
                               className={`w-full input-field font-mono text-[10px] py-2 pr-8 ${
                                   state.validationErrors?.accessToken 
                                   ? 'border-red-500 bg-red-50/10' 
                                   : state.tokenWarning
                                        ? 'border-amber-500 bg-amber-50/10'
                                        : ''
                               }`}
                               placeholder="gcloud auth print-access-token"
                           />
                           {state.accessToken && (
                               <button 
                                   onClick={() => updateState({ accessToken: '' })}
                                   className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                               >
                                   <Icons.X size={12} />
                               </button>
                           )}
                       </div>

                       {/* Token Warning Message */}
                       <AnimatePresence>
                           {state.tokenWarning && (
                               <motion.div
                                   initial={{ opacity: 0, height: 0 }}
                                   animate={{ opacity: 1, height: 'auto' }}
                                   exit={{ opacity: 0, height: 0 }}
                                   className="mt-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-lg p-2"
                               >
                                   <div className="text-amber-500 shrink-0 mt-0.5"><Icons.Alert size={12} /></div>
                                   <div className="flex-1">
                                       <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold leading-tight">
                                           Token Validation Warning
                                       </p>
                                       <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">
                                           {state.tokenWarning}
                                       </p>
                                   </div>
                               </motion.div>
                           )}
                       </AnimatePresence>
                       
                       {!state.accessToken && (
                           <div className="bg-slate-100 dark:bg-slate-900 rounded p-2 flex items-center justify-between group cursor-pointer" onClick={() => navigator.clipboard.writeText('gcloud auth print-access-token')}>
                               <code className="text-[9px] font-mono text-slate-500">gcloud auth print-access-token</code>
                               <Icons.Copy size={10} className="text-slate-400 group-hover:text-indigo-500" />
                           </div>
                       )}
                   </div>
               </motion.div>
           )}
       </div>
    </div>
  );
});

export default ConfigurationPanel;
