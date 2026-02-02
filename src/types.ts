
export enum ProvisioningModel {
  SPOT = 'SPOT',
  STANDARD = 'STANDARD'
}

export enum TargetShape {
  ANY = 'ANY',
  ANY_SINGLE_ZONE = 'ANY_SINGLE_ZONE'
}

export type ApiTargetShape = 'ANY' | 'ANY_SINGLE_ZONE';

export interface InstanceSelection {
  machineTypes: string[];
}

export interface CapacityAdvisorRequest {
  instanceProperties: {
    scheduling: {
      provisioningModel: ProvisioningModel;
    };
  };
  instanceFlexibilityPolicy: {
    instanceSelections: Record<string, InstanceSelection>;
  };
  distributionPolicy: {
    targetShape: ApiTargetShape;
    zones?: Array<{ zone: string }>;
  };
  size: number;
}

export interface Score {
  name: string;
  value: number;
}

export interface Shard {
  location?: string; // Legacy/Mock
  zone?: string;     // API
  machineType: string;
  count?: number;    // Legacy/Mock
  instanceCount?: number; // API
  provisioningModel: ProvisioningModel;
}

export interface Recommendation {
  scores: Score[] | {
    obtainability: number;
    uptimeScore: number;
  };
  shards: Shard[];
  estimatedUptime?: number;
}

export interface CapacityAdvisorResponse {
  recommendations: Recommendation[];
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  latencyMs?: number;
  status?: number;
  curl?: string;
  responseBody?: any;
}

export interface GeminiDebugEntry {
  prompt: string;
  responseRaw: string;
  timestamp: string;
  model: string;
}

export interface BatchDebugEntry {
  scenarioId: string;
  scenarioName: string;
  request: {
    url: string;
    method: string;
    body: CapacityAdvisorRequest;
    curl: string;
  };
  response: CapacityAdvisorResponse | null;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
  timestamp: string;
}

export interface DebugData {
  request: {
    url: string;
    method: string;
    body: CapacityAdvisorRequest;
    curl: string;
  } | null;
  response: CapacityAdvisorResponse | null;
  batchRequests?: BatchDebugEntry[]; // New field for batch mode
  geminiDebug: GeminiDebugEntry | null;
  startTime: string | null;
  endTime: string | null;
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  mode: 'mock' | 'real';
  logs: LogEntry[];
  network: NetworkLogEntry[];
  summary?: string;
}

export interface GroundingMetadata {
  insight: string;
  sources: { title: string; uri: string }[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  config: {
    project: string;
    region: string;
    machineType: string;
    size: number;
    targetShape: TargetShape;
  };
  result: CapacityAdvisorResponse;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  project: string;
  region: string;
  zones: string[];
  machineType: string;
  size: number;
  targetShape: TargetShape;
  workloadProfile: 'generic' | 'batch' | 'serving' | 'stateful';
  growthScenario: 'steady' | 'daily_peak' | 'viral' | 'seasonal';
}

export interface ScenarioResult extends ScenarioConfig {
  status: 'pending' | 'loading' | 'success' | 'error';
  response?: CapacityAdvisorResponse;
  errorDetails?: string;
  groundingMetadata?: GroundingMetadata | null;
}

export interface AppState {
  // Draft State (The "Editor")
  project: string;
  region: string;
  zones: string[];
  selectedMachineType: string;
  selectedFamilies: string[];
  size: number;
  targetShape: TargetShape;
  workloadProfile: 'generic' | 'batch' | 'serving' | 'stateful';
  growthScenario: 'steady' | 'daily_peak' | 'viral' | 'seasonal';
  
  // Batch State
  scenarios: ScenarioConfig[];
  batchResults: ScenarioResult[];
  
  loading: boolean;
  groundingLoading: boolean;
  result: CapacityAdvisorResponse | null; // Keep for legacy/single view compatibility if needed, or deprecate
  error: string | null;
  debugData: DebugData;
  showDebug: boolean;
  mockMode: boolean;
  accessToken: string;
  searchTerm: string;
  darkMode: boolean;
  enableGemini: boolean;
  groundingMetadata: GroundingMetadata | null;
  toasts: Toast[];
  validationErrors: Record<string, boolean>;
  history: HistoryEntry[];
  comparisonMode: boolean;
  selectedComparisonIds: string[];
  baselineRunId: string | null;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  tokenWarning: string | null;
}
