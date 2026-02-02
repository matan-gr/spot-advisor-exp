
import { AppState, CapacityAdvisorRequest, ProvisioningModel, TargetShape, ApiTargetShape, Recommendation } from './types';

/**
 * Parses raw API errors into user-friendly, actionable messages.
 * returns "Title: Detail" format.
 */
export const getFriendlyErrorMessage = (status: number, rawText: string) => {
  let title = 'System Error';
  let detail = 'An unexpected error occurred. Please check the debug console for details.';
  let actionable = '';

  // 1. Clean up standard fetch error prefixes
  let cleanRaw = rawText;
  if (cleanRaw.startsWith('Error: ')) cleanRaw = cleanRaw.substring(7);

  try {
    const json = JSON.parse(cleanRaw);
    
    // Handle Custom Client-Side Errors (e.g., Missing Token)
    if (json.clientError) {
        return `${json.title}: ${json.message} (${json.actionable})`;
    }

    // Handle GCP Standard Error Format
    if (json.error) {
       const apiError = json.error;
       detail = apiError.message || detail;
       
       // Parse Specific "Reason" codes from GCP
       if (apiError.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
          const firstErr = apiError.errors[0];
          const reason = firstErr.reason;
          
          switch (reason) {
             // --- QUOTA ISSUES ---
             case 'quotaExceeded':
             case 'limitExceeded':
             case 'rateLimitExceeded': 
                title = 'Quota Limit Reached';
                const metricMatch = firstErr.message?.match(/Quota '([^']+)' exceeded/);
                const metric = metricMatch ? metricMatch[1] : 'CPUs';
                detail = `Project lacks sufficient ${metric} quota in this region.`;
                actionable = 'Request a quota increase in IAM & Admin.';
                break;
                
             // --- RATE LIMITING ---
             case 'userRateLimitExceeded':
                title = 'API Rate Limit Exceeded';
                detail = 'Too many requests were sent in a short period.';
                actionable = 'Wait 60 seconds before retrying.';
                break;
                
             // --- AUTHENTICATION ---
             case 'accessNotConfigured':
             case 'authError':
             case 'tokenExpired':
                title = 'Authentication Failed';
                detail = 'The Access Token is invalid, expired, or missing scopes.';
                actionable = 'Run: gcloud auth print-access-token';
                break;
             
             // --- PERMISSIONS ---
             case 'forbidden':
             case 'insufficientPermissions':
                title = 'Access Denied';
                detail = 'Your account lacks the "Compute Viewer" IAM role.';
                actionable = 'Verify IAM permissions for this Project ID.';
                break;

             // --- CONFIGURATION ---
             case 'invalid':
             case 'badRequest':
             case 'invalidParameter':
                title = 'Invalid Configuration';
                detail = `Request parameters are invalid. ${firstErr.message}`;
                actionable = 'Check Region, Project ID, and Machine Type.';
                break;

             // --- NOT FOUND ---
             case 'notFound':
             case 'resourceNotFound':
                title = 'Resource Not Found';
                detail = 'The specified Project, Region, or Zone does not exist.';
                actionable = 'Verify the Project ID and Region spelling.';
                break;
                
             // --- LOGIC / BUSINESS ERRORS ---
             case 'stockout':
                title = 'Capacity Stockout';
                detail = 'The requested Machine Type is unavailable in this region.';
                actionable = 'Try a different region or machine family.';
                break;

             case 'zoneResourcePoolExhausted':
                title = 'Zone Capacity Exhausted';
                detail = 'The specific zone does not have enough resources for this request.';
                actionable = 'Try a different zone or reduce the request count.';
                break;

             case 'unsupported':
                title = 'Unsupported Configuration';
                detail = 'The requested machine type or feature is not available in this zone.';
                actionable = 'Check the "Regions & Zones" documentation for availability.';
                break;

             default:
                detail = firstErr.message || detail;
                actionable = 'Check Debug Console for raw response.';
          }
       }
    }
  } catch (e) {
    // Non-JSON Error (e.g. HTML 502 Bad Gateway)
    if (status === 401) {
        title = 'Session Expired';
        detail = 'Your access token is no longer valid.';
        actionable = 'Generate a new token via CLI.';
    } else if (status === 403) {
        title = 'Permission Denied';
        detail = 'You are not authorized to access this resource.';
        actionable = 'Check IAM roles.';
    } else if (status === 404) {
        title = 'Endpoint Not Found';
        detail = 'The API endpoint could not be reached.';
    } else if (status === 429) {
        title = 'Traffic Limit';
        detail = 'You are sending requests too fast.';
        actionable = 'Slow down and try again in a minute.';
    } else if (status >= 500) {
        title = 'Service Unavailable';
        detail = 'Google Cloud is temporarily experiencing issues.';
        actionable = 'Check Google Cloud Status Dashboard.';
    } else {
        detail = cleanRaw.length > 100 ? cleanRaw.substring(0, 100) + '...' : cleanRaw;
    }
  }

  // Return a formatted, professional message
  return `${title}: ${detail} ${actionable ? `\n\nAction: ${actionable}` : ''} ${status ? `(HTTP ${status})` : ''}`;
};

const buildInstanceProperties = (): CapacityAdvisorRequest['instanceProperties'] => ({
  scheduling: { 
    provisioningModel: ProvisioningModel.SPOT 
  },
});

const buildInstanceFlexibilityPolicy = (machineType: string): CapacityAdvisorRequest['instanceFlexibilityPolicy'] => ({
  instanceSelections: {
    "primary": { 
      machineTypes: [machineType]
    },
  },
});

/**
 * Maps internal AppState to strict API `distributionPolicy` structure.
 */
const buildDistributionPolicy = (targetShape: TargetShape, zones?: string[]): CapacityAdvisorRequest['distributionPolicy'] => {
  const policy: CapacityAdvisorRequest['distributionPolicy'] = { 
    targetShape: targetShape as ApiTargetShape
  };

  if (zones && zones.length > 0) {
    policy.zones = zones.map(z => ({ zone: `zones/${z}` }));
  }

  return policy;
};

export const buildCapacityAdvisorRequest = (state: AppState): CapacityAdvisorRequest => {
  return {
    instanceProperties: buildInstanceProperties(),
    instanceFlexibilityPolicy: buildInstanceFlexibilityPolicy(state.selectedMachineType),
    distributionPolicy: buildDistributionPolicy(state.targetShape, state.zones),
    size: state.size,
  };
};

// --- Machine Type Helpers ---

export const getMachineTypeFamily = (name: string): string => {
  const n = name.toLowerCase();
  
  // Accelerators
  if (n.startsWith('a2') || n.startsWith('a3') || n.startsWith('g2')) return 'Accelerator Optimized';
  
  // Memory
  if (n.startsWith('m1') || n.startsWith('m2') || n.startsWith('m3')) return 'Memory Optimized';
  
  // Compute Optimized (Strict C2/H3 definition usually, but C2D also)
  if (n.startsWith('c2') || n.startsWith('h3')) return 'Compute Optimized';
  
  // Storage
  if (n.startsWith('z3')) return 'Storage Optimized';

  // General Purpose (Includes C3, C4, N*, E*, T*)
  return 'General Purpose';
};

export const getMachineTypeArch = (name: string): 'x86' | 'Arm' => {
  const n = name.toLowerCase();
  if (n.startsWith('t2a')) return 'Arm';
  if (n.startsWith('c4a')) return 'Arm'; // Axion
  return 'x86';
};

export const getMachineTypeSeries = (name: string): string => {
  return name.split('-')[0].toUpperCase();
};

export const getScoreValue = (rec: Recommendation | undefined, type: 'obtainability' | 'uptime' | 'azAvailability'): number => {
  if (!rec || !rec.scores) return 0;
  
  // Normalize type to possible keys
  let targetKeys: string[] = [];
  
  if (type === 'obtainability') {
    targetKeys = ['obtainability', 'obtainabilityScore', 'obtainability_score'];
  } else if (type === 'uptime') {
    targetKeys = ['uptime', 'uptimeScore', 'uptime_score'];
  } else if (type === 'azAvailability') {
    targetKeys = ['azAvailability', 'az_availability', 'availability'];
  }

  // Handle Array format (Legacy/Some API responses)
  if (Array.isArray(rec.scores)) {
    const found = rec.scores.find((s: any) => targetKeys.includes(s.name));
    return found?.value || 0;
  }
  
  // Handle Object format
  const scoresObj = rec.scores as any; // Cast to any to access dynamic keys safely
  for (const key of targetKeys) {
    if (scoresObj[key] !== undefined) {
      return Number(scoresObj[key]);
    }
  }
  
  return 0;
};

export const getReliabilityTier = (uptimeScore: number): { label: string, color: string, description: string } => {
    if (uptimeScore >= 99) return { label: 'Excellent', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', description: 'Very low risk of preemption.' };
    if (uptimeScore >= 90) return { label: 'Good', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800', description: 'Standard Spot availability.' };
    if (uptimeScore >= 70) return { label: 'Fair', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', description: 'Moderate preemption risk.' };
    return { label: 'Volatile', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', description: 'High risk of preemption.' };
};

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
