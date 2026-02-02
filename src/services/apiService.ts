
import { CapacityAdvisorRequest, CapacityAdvisorResponse, NetworkLogEntry, AppState } from '../types';
import { buildCapacityAdvisorRequest, getMachineTypeFamily, getMachineTypeArch, getMachineTypeSeries, getScoreValue } from '../utils';
import { MachineTypeOption } from '../config';
import { apiRateLimiter } from './rateLimiter';

type NetworkLogCallback = (entry: NetworkLogEntry) => void;

const API_VERSIONS = {
  V1: 'https://compute.googleapis.com/compute/v1',
  ALPHA: 'https://compute.googleapis.com/compute/alpha'
};

// Simple In-Memory Cache
const CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 Minutes

const getFromCache = <T>(key: string): T | null => {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    CACHE.delete(key);
    return null;
  }
  return entry.data as T;
};

const setInCache = (key: string, data: any) => {
  CACHE.set(key, { data, timestamp: Date.now() });
};

export class ApiError extends Error {
  status: number;
  details: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Generic GCP API Client Wrapper
 * Handles Rate Limiting, Authorization, Logging, Error Parsing, and Exponential Backoff.
 */
async function gcpRequest<T>(
  url: string,
  method: string,
  accessToken: string,
  body: unknown | null,
  onNetworkLog?: NetworkLogCallback,
  signal?: AbortSignal,
  retries = 3,
  backoff = 1000
): Promise<T> {
  // 1. Client-Side Rate Limiting (Wait instead of throw)
  await apiRateLimiter.waitForToken();

  const startTime = Date.now();
  
  // Construct a usable cURL command for debugging (with redacted token)
  const curl = `curl -X ${method} "${url}" \\
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \\
  -H "Content-Type: application/json" \\
  ${body ? `-d '${JSON.stringify(body, null, 2)}'` : ''}`;

  let response: Response | undefined;
  let responseText = '';
  let errorToThrow: any = null;

  try {
    // Clean the token to remove "Bearer " if the user pasted it in
    const cleanToken = accessToken.trim().replace(/^Bearer\s+/i, '');
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${cleanToken}`
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    // Force fresh data by disabling cache
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal,
      cache: 'no-store'
    });

    responseText = await response.text();

    if (!response.ok) {
      // Handle Retry Logic for Transient Errors (429, 500, 502, 503, 504)
      if (retries > 0 && (response.status === 429 || response.status >= 500)) {
          console.warn(`API Error ${response.status}. Retrying in ${backoff}ms... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          return gcpRequest<T>(url, method, accessToken, body, onNetworkLog, signal, retries - 1, backoff * 2);
      }

      try {
        const errorJson = JSON.parse(responseText);
        errorToThrow = new ApiError(errorJson.error?.message || `HTTP ${response.status} Error`, response.status, errorJson);
      } catch (e) {
        errorToThrow = new ApiError(responseText || `HTTP ${response.status} Error`, response.status);
      }
      throw errorToThrow;
    }

    const jsonResponse = JSON.parse(responseText) as T;
    
    // Log successful response
    if (onNetworkLog) {
      onNetworkLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method,
        url,
        headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
        body,
        latencyMs: Date.now() - startTime,
        status: response.status,
        curl,
        // Include the response body in the log
        responseBody: jsonResponse 
      });
    }

    return jsonResponse;

  } catch (error: any) {
    errorToThrow = error;
    throw error;
  } finally {
    // Log error cases (if not already logged as success)
    if (onNetworkLog && errorToThrow && errorToThrow.name !== 'AbortError') {
       onNetworkLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method,
        url,
        headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
        body,
        latencyMs: Date.now() - startTime,
        status: response ? response.status : 0,
        curl,
        responseBody: responseText // Log raw text for errors
      });
    }
  }
}

/**
 * Fetches available regions from GCP.
 */
export const fetchAvailableRegions = async (
  accessToken: string,
  project: string,
  onNetworkLog?: NetworkLogCallback
): Promise<Record<string, string[]>> => {
  const url = `${API_VERSIONS.V1}/projects/${project}/regions`;
  const cacheKey = `regions-${project}`;
  
  const cached = getFromCache<Record<string, string[]>>(cacheKey);
  if (cached) return cached;

  try {
    const data = await gcpRequest<{ items: any[] }>(url, 'GET', accessToken, null, onNetworkLog);
    
    const regionConfig: Record<string, string[]> = {};
    if (data.items) {
      for (const item of data.items) {
        if (item.zones && Array.isArray(item.zones)) {
           const zoneNames = item.zones
             .map((z: string) => z.split('/').pop() || '')
             .filter((z: string) => z);
           
           if (zoneNames.length > 0) {
             regionConfig[item.name] = zoneNames.sort();
           }
        }
      }
    }
    setInCache(cacheKey, regionConfig);
    return regionConfig;
  } catch (e) {
    // Re-throw if it's an auth error so UI can show it, otherwise swallow for fallback
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        throw e;
    }
    throw e;
  }
};

/**
 * Fetches machine types for a specific zone.
 */
export const fetchMachineTypes = async (
  accessToken: string,
  project: string,
  zone: string,
  onNetworkLog?: NetworkLogCallback
): Promise<MachineTypeOption[]> => {
  const url = `${API_VERSIONS.V1}/projects/${project}/zones/${zone}/machineTypes`;
  const cacheKey = `machineTypes-${project}-${zone}`;

  const cached = getFromCache<MachineTypeOption[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await gcpRequest<{ items: any[] }>(url, 'GET', accessToken, null, onNetworkLog);
    
    if (!data.items) return [];

    const machineTypes: MachineTypeOption[] = data.items.map((item: any) => ({
      id: item.name,
      name: item.description || `${getMachineTypeSeries(item.name)} Standard ${item.guestCpus}`,
      family: getMachineTypeFamily(item.name),
      series: getMachineTypeSeries(item.name),
      cores: item.guestCpus,
      memory: Math.ceil(item.memoryMb / 1024) + 'GB',
      arch: getMachineTypeArch(item.name)
    }));

    const sorted = machineTypes.sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id));
    setInCache(cacheKey, sorted);
    return sorted;

  } catch (e) {
    return [];
  }
};

/**
 * Main API call to Google Cloud Capacity Advisor (Alpha).
 */
export const fetchAllZonesCapacity = async (
  accessToken: string,
  project: string,
  region: string,
  appState: AppState,
  signal?: AbortSignal,
  onNetworkLog?: NetworkLogCallback
): Promise<CapacityAdvisorResponse> => {
  
  // Appended timestamp to prevent caching at the URL level
  const url = `${API_VERSIONS.ALPHA}/projects/${project}/regions/${region}/advice/capacity?_t=${Date.now()}`;
  const requestBody = buildCapacityAdvisorRequest(appState);

  const data = await gcpRequest<CapacityAdvisorResponse>(
    url, 
    'POST', 
    accessToken, 
    requestBody, 
    onNetworkLog, 
    signal
  );

  // Robust handling for empty or missing recommendation arrays
  if (!data.recommendations || data.recommendations.length === 0) {
      throw new ApiError("Capacity Stockout", 404, {
          reason: "stockout",
          message: `The requested capacity for ${appState.selectedMachineType} in ${region} is currently unavailable via Spot.`
      });
  }

  // Sort recommendations by obtainability score (descending)
  data.recommendations.sort((a, b) => {
      const scoreA = getScoreValue(a, 'obtainability');
      const scoreB = getScoreValue(b, 'obtainability');
      return scoreB - scoreA;
  });

  return data;
};

/**
 * Validates the scopes of the provided access token.
 */
export const validateTokenScopes = async (
  accessToken: string,
  onNetworkLog?: NetworkLogCallback
): Promise<{ valid: boolean; scopes: string[]; warning?: string }> => {
  const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`;
  
  try {
    // We use standard fetch here to avoid the gcpRequest wrapper which adds headers
    const startTime = Date.now();
    const response = await fetch(url);
    const data = await response.json();

    if (onNetworkLog) {
        onNetworkLog({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: 'GET',
            url: 'https://oauth2.googleapis.com/tokeninfo',
            headers: {},
            body: null,
            latencyMs: Date.now() - startTime,
            status: response.status,
            responseBody: data
        });
    }

    if (!response.ok) {
        return { valid: false, scopes: [], warning: 'Invalid or expired token' };
    }

    const scopes = data.scope ? data.scope.split(' ') : [];
    
    // Check for cloud-platform (too broad) or specific required scopes
    const hasCloudPlatform = scopes.includes('https://www.googleapis.com/auth/cloud-platform');
    const hasCompute = scopes.includes('https://www.googleapis.com/auth/compute') || scopes.includes('https://www.googleapis.com/auth/compute.readonly');
    
    if (hasCloudPlatform) {
        // Valid token with broad access. No warning needed for user experience unless strictly auditing.
        return { valid: true, scopes };
    }

    if (!hasCompute) {
        return { 
            valid: true, 
            scopes, 
            warning: 'Missing "compute.readonly" scope. To fix: Run "gcloud auth print-access-token --scopes=https://www.googleapis.com/auth/compute.readonly"' 
        };
    }

    return { valid: true, scopes };

  } catch (e) {
    return { valid: false, scopes: [], warning: 'Could not validate token' };
  }
};
