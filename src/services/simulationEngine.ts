
import { ProvisioningModel, CapacityAdvisorResponse, Recommendation, TargetShape, Shard } from '../types';
import { REGION_CONFIG, MachineTypeOption } from '../config';
import { getScoreValue } from '../utils';

/**
 * DETERMINISTIC HASH FUNCTION
 * Generates a consistent number between 0 and 1 based on an input string.
 */
const pseudoRandom = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const result = (Math.abs(hash) % 10000) / 10000;
  return result;
};

// Scarcity Tiers: 1 = Abundant, 5 = Allocation Only
const getFamilyScarcityTier = (family: string, series: string): number => {
  const s = series.toUpperCase();
  // Ultra Scarce / Allocation Only (H100, etc)
  if (s.startsWith('A3') || s.startsWith('H3')) return 5; 
  
  // Very Scarce (High Demand GPUs - A100, L4)
  if (s.startsWith('A2') || s.startsWith('G2')) return 4.5;
  
  // Scarce (Cutting Edge Compute - C3, C4)
  if (s.startsWith('C3') || s.startsWith('C4') || s.startsWith('M3')) return 4;
  
  // Specialized (Large Memory, Compute Opt)
  if (s.startsWith('M1') || s.startsWith('M2') || s.startsWith('C2') || s.startsWith('C4A')) return 3;
  
  // Moderate
  if (s.startsWith('N2D') || s.startsWith('T2D') || s.startsWith('T2A')) return 2;
  
  // Abundant (Commodity - E2, N1, N2)
  return 1; 
};

/**
 * Estimates the "Depth" of the Spot pool for a specific tier in a single zone.
 * This represents the theoretical maximum burst size before hitting stockouts.
 */
const getEstimatedSpotDepth = (tier: number, isGPU: boolean): number => {
    if (isGPU) {
        if (tier >= 5) return 8;   // A3/H100: Extremely shallow pool
        if (tier >= 4.5) return 40; // A2/G2: Moderate GPU pool
        return 100; // Older/Smaller GPUs
    }

    switch (Math.floor(tier)) {
        case 5: return 50;   // Ultra High End CPU
        case 4: return 200;  // Modern High Performance (C3)
        case 3: return 500;  // Specialized
        case 2: return 1500; // Standard Modern
        case 1: return 5000; // Commodity (E2/N2) - Massive pools
        default: return 100;
    }
};

// Regional Congestion Modifiers (Higher = More Congested/Lower Score)
const REGION_CONGESTION: Record<string, number> = {
  'us-east1': 0.15, // Highly congested
  'us-central1': 0.10, // Moderate congestion
  'europe-west1': 0.10,
  'europe-west4': 0.12, // NL is often tight
  'asia-east1': 0.05,
  // Optimistic Regions
  'us-west4': -0.15, // Vegas often has capacity
  'us-west1': -0.10, // Oregon good for some types
  'us-south1': -0.10,
  'europe-north1': -0.20, // Finland usually empty
};

// Zone Bias: Simulate that Zone 'a' is often legacy/full
const ZONE_BIAS: Record<string, number> = {
  'a': 0.05, 'b': 0.0, 'c': -0.05, 'd': 0.0, 'f': -0.10
};

export const getNuancedSimulationMetrics = (
  family: string,
  machineType: string,
  region: string,
  zone: string,
  size: number
) => {
  const series = machineType.split('-')[0].toUpperCase();
  const tier = getFamilyScarcityTier(family, series);
  const isGPU = family.includes('Accelerator') || series.startsWith('A') || series.startsWith('G');
  
  // 1. Calculate Base Pool Depth & Saturation
  const poolDepth = getEstimatedSpotDepth(tier, isGPU);
  const saturation = size / poolDepth; // 0.1 = 10% of pool, 1.5 = 150% (Impossible)

  // 2. Base Obtainability based on Saturation
  let obtainability = 1.0;

  if (saturation > 1.2) {
      // Request exceeds estimated physical capacity
      obtainability = 0.01; 
  } else if (saturation > 0.8) {
      // Request is draining the pool
      obtainability = 0.15; 
  } else if (saturation > 0.4) {
      // Significant impact
      obtainability = 0.50; 
  } else {
      // Healthy baseline based on tier
      obtainability = tier === 1 ? 0.98 : (1.0 - (tier * 0.12));
  }

  // 3. Apply Regional & Zonal Factors
  const regionMod = REGION_CONGESTION[region] || 0;
  const zoneChar = zone.slice(-1);
  const zoneMod = ZONE_BIAS[zoneChar] || 0;
  
  // High saturation makes you MORE sensitive to regional congestion
  const sensitivityMultiplier = saturation > 0.2 ? 1.5 : 1.0;
  obtainability -= ((regionMod + zoneMod) * sensitivityMultiplier);

  // 4. Deterministic Noise & Events
  const seed = `${region}-${zone}-${machineType}`;
  const noise = (pseudoRandom(seed) * 0.15) - 0.07; 
  obtainability += noise;

  // 5. Special GPU Constraints (Hard Cap)
  if (isGPU && size > 50) {
      // Even if math says yes, getting >50 Spot GPUs in one zone is rare
      obtainability = Math.min(obtainability, 0.25);
  }

  // 6. Large Scale Penalty (General)
  // Even for E2, asking for 2000 VMs is risky operationally
  if (size > 500) {
      obtainability -= 0.3;
  }

  // 7. "Lucky Find" (Only for small/medium requests)
  const luckyRoll = pseudoRandom(seed + 'lucky');
  if (saturation < 0.3 && luckyRoll > 0.85) {
     obtainability += 0.15;
  }

  // 8. Uptime Calculation
  let uptimeScore = obtainability;
  
  // Physics: If the pool is saturated, preemption probability skyrockets
  if (saturation > 0.5) {
      uptimeScore = Math.min(uptimeScore, 0.30);
  } else if (tier === 1 && saturation < 0.1) {
      uptimeScore = Math.max(uptimeScore, 0.90); // E2 is very stable if request is small
  }

  // Clamp values
  obtainability = Math.max(0.01, Math.min(0.99, obtainability));
  uptimeScore = Math.max(0.01, Math.min(0.99, uptimeScore));

  return { obtainability, uptimeScore };
};

export const generateMockRecommendationsWithShape = (
    region: string,
    machineType: string,
    machineTypeDetails: MachineTypeOption | undefined,
    size: number,
    shape: TargetShape
  ): CapacityAdvisorResponse => {
    
    const zones = REGION_CONFIG[region] || [`${region}-a`, `${region}-b`, `${region}-c`];
    const recommendations: Recommendation[] = [];
  
    if (shape === TargetShape.ANY) {
        // ANY Mode: Generate multiple options with different distribution strategies (Mixed & Single)
        
        // Strategy 1: Even Split across 3 zones (if possible)
        if (zones.length >= 3 && size >= 3) {
            const numShards = 3;
            const splitSize = Math.floor(size / numShards);
            const remainder = size % numShards;
            
            // Pick top 3 zones
            const zoneMetrics = zones.map(z => ({
                zone: z,
                ...getNuancedSimulationMetrics(machineTypeDetails?.family || 'General Purpose', machineType, region, z, splitSize)
            })).sort((a, b) => b.obtainability - a.obtainability);

            const top3 = zoneMetrics.slice(0, 3);
            
            if (top3.every(z => z.obtainability > 0.05)) {
                const shards: Shard[] = top3.map((z, idx) => ({
                    location: `projects/mock/zones/${z.zone}`,
                    machineType,
                    count: idx === 0 ? splitSize + remainder : splitSize,
                    provisioningModel: ProvisioningModel.SPOT
                }));
                
                const avgScore = shards.reduce((acc, s, i) => acc + top3[i].obtainability, 0) / numShards;
                const avgUptime = shards.reduce((acc, s, i) => acc + top3[i].uptimeScore, 0) / numShards;

                recommendations.push({
                    scores: {
                        obtainability: avgScore,
                        uptimeScore: avgUptime
                    },
                    shards
                });
            }
        }

        // Strategy 2: Split across top 2 zones
        if (zones.length >= 2 && size >= 2) {
            const numShards = 2;
            const splitSize = Math.floor(size / numShards);
            const remainder = size % numShards;

            // Pick top 2 zones
            const zoneMetrics = zones.map(z => ({
                zone: z,
                ...getNuancedSimulationMetrics(machineTypeDetails?.family || 'General Purpose', machineType, region, z, splitSize)
            })).sort((a, b) => b.obtainability - a.obtainability);

            const top2 = zoneMetrics.slice(0, 2);

            if (top2.every(z => z.obtainability > 0.05)) {
                const shards: Shard[] = top2.map((z, idx) => ({
                    location: `projects/mock/zones/${z.zone}`,
                    machineType,
                    count: idx === 0 ? splitSize + remainder : splitSize,
                    provisioningModel: ProvisioningModel.SPOT
                }));

                const avgScore = shards.reduce((acc, s, i) => acc + top2[i].obtainability, 0) / numShards;
                const avgUptime = shards.reduce((acc, s, i) => acc + top2[i].uptimeScore, 0) / numShards;

                recommendations.push({
                    scores: {
                        obtainability: avgScore,
                        uptimeScore: avgUptime
                    },
                    shards
                });
            }
        }

        // Strategy 3: Also include Single Zone options in ANY mode
        zones.forEach(zone => {
            const { obtainability, uptimeScore } = getNuancedSimulationMetrics(
              machineTypeDetails?.family || 'General Purpose',
              machineType,
              region,
              zone,
              size
            );

            if (obtainability > 0.02) {
                recommendations.push({
                  scores: {
                    obtainability: obtainability,
                    uptimeScore: uptimeScore
                  },
                  shards: [{
                    location: `projects/mock/zones/${zone}`,
                    machineType: machineType,
                    count: size,
                    provisioningModel: ProvisioningModel.SPOT,
                  }]
                });
            }
        });

        // Sort options by score
        recommendations.sort((a, b) => {
            const sA = getScoreValue(a, 'obtainability');
            const sB = getScoreValue(b, 'obtainability');
            return sB - sA;
        });

    } else {
        // ANY_SINGLE_ZONE Mode
        zones.forEach(zone => {
            const { obtainability, uptimeScore } = getNuancedSimulationMetrics(
              machineTypeDetails?.family || 'General Purpose',
              machineType,
              region,
              zone,
              size
            );

            // Only recommend if obtainability is non-trivial (Stockout Filter)
            if (obtainability > 0.02) {
                recommendations.push({
                  scores: {
                    obtainability: obtainability,
                    uptimeScore: uptimeScore
                  },
                  shards: [{
                    location: `projects/mock/zones/${zone}`,
                    machineType: machineType,
                    count: size,
                    provisioningModel: ProvisioningModel.SPOT,
                  }]
                });
            }
        });
        
        recommendations.sort((a, b) => {
            const sA = getScoreValue(a, 'obtainability');
            const sB = getScoreValue(b, 'obtainability');
            return sB - sA;
         });
    }
  
    return { recommendations };
  };
