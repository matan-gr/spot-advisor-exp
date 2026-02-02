
import { AppState, HistoryEntry, NetworkLogEntry } from '../types';

const GCS_API_BASE = 'https://storage.googleapis.com/storage/v1';

export const getBucketName = (projectId: string) => `capacity-planner-history-${projectId}`;

export const checkBucketExists = async (
  token: string, 
  bucketName: string,
  logNetwork?: (entry: NetworkLogEntry) => void
): Promise<boolean> => {
  const url = `${GCS_API_BASE}/b/${bucketName}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (logNetwork) {
        logNetwork({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: 'GET',
            url,
            headers: { 'Authorization': 'Bearer [HIDDEN]' },
            body: null,
            latencyMs: Date.now() - startTime,
            status: response.status
        });
    }

    return response.ok;
  } catch (error) {
    console.error('Error checking bucket:', error);
    return false;
  }
};

export const createBucket = async (
  token: string, 
  projectId: string, 
  bucketName: string,
  logNetwork?: (entry: NetworkLogEntry) => void
): Promise<boolean> => {
  const url = `${GCS_API_BASE}/b?project=${projectId}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: bucketName,
        location: 'US', // Default to US multi-region for high availability
        storageClass: 'STANDARD',
        iamConfiguration: {
          uniformBucketLevelAccess: {
            enabled: true
          }
        }
      })
    });

    if (logNetwork) {
        logNetwork({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: 'POST',
            url,
            headers: { 'Authorization': 'Bearer [HIDDEN]', 'Content-Type': 'application/json' },
            body: { 
                name: bucketName, 
                location: 'US',
                iamConfiguration: { uniformBucketLevelAccess: { enabled: true } }
            },
            latencyMs: Date.now() - startTime,
            status: response.status
        });
    }

    return response.ok;
  } catch (error) {
    console.error('Error creating bucket:', error);
    return false;
  }
};

export const fetchHistoryFromGCS = async (
  token: string, 
  projectId: string,
  logNetwork?: (entry: NetworkLogEntry) => void
): Promise<HistoryEntry[] | null> => {
  const bucketName = getBucketName(projectId);
  const url = `${GCS_API_BASE}/b/${bucketName}/o/history.json?alt=media`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (logNetwork) {
        logNetwork({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: 'GET',
            url,
            headers: { 'Authorization': 'Bearer [HIDDEN]' },
            body: null,
            latencyMs: Date.now() - startTime,
            status: response.status
        });
    }

    if (response.status === 404 || response.status === 403 || response.status === 401) {
      return []; // File doesn't exist, access denied, or token invalid - return empty history
    }

    if (!response.ok) {
      let details = response.statusText;
      try {
        const text = await response.text();
        const json = JSON.parse(text);
        if (json.error?.message) details = json.error.message;
        else details = text;
      } catch (e) {
        // ignore
      }
      throw new Error(`Failed to fetch history: ${response.status} ${details}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching history from GCS:', error);
    return null;
  }
};

export const saveHistoryToGCS = async (
  token: string, 
  projectId: string, 
  history: HistoryEntry[],
  logNetwork?: (entry: NetworkLogEntry) => void
): Promise<boolean> => {
  const bucketName = getBucketName(projectId);
  
  // 1. Ensure bucket exists
  const exists = await checkBucketExists(token, bucketName, logNetwork);
  if (!exists) {
    const created = await createBucket(token, projectId, bucketName, logNetwork);
    if (!created) return false;
  }

  // 2. Upload history.json
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=history.json`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(history)
    });

    if (logNetwork) {
        logNetwork({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: 'POST',
            url,
            headers: { 'Authorization': 'Bearer [HIDDEN]', 'Content-Type': 'application/json' },
            body: '[History Data]',
            latencyMs: Date.now() - startTime,
            status: response.status
        });
    }

    return response.ok;
  } catch (error) {
    console.error('Error saving history to GCS:', error);
    return false;
  }
};
