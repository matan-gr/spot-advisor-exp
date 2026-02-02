
export const REGION_CONFIG: Record<string, string[]> = {
  // Americas
  'us-central1': ['us-central1-a', 'us-central1-b', 'us-central1-c', 'us-central1-f'],
  'us-east1': ['us-east1-b', 'us-east1-c', 'us-east1-d'],
  'us-east4': ['us-east4-a', 'us-east4-b', 'us-east4-c'],
  'us-east5': ['us-east5-a', 'us-east5-b', 'us-east5-c'],
  'us-west1': ['us-west1-a', 'us-west1-b', 'us-west1-c'],
  'us-west2': ['us-west2-a', 'us-west2-b', 'us-west2-c'],
  'us-west3': ['us-west3-a', 'us-west3-b', 'us-west3-c'],
  'us-west4': ['us-west4-a', 'us-west4-b', 'us-west4-c'],
  'us-south1': ['us-south1-a', 'us-south1-b', 'us-south1-c'],
  'northamerica-northeast1': ['northamerica-northeast1-a', 'northamerica-northeast1-b', 'northamerica-northeast1-c'],
  'northamerica-northeast2': ['northamerica-northeast2-a', 'northamerica-northeast2-b', 'northamerica-northeast2-c'],
  'southamerica-east1': ['southamerica-east1-a', 'southamerica-east1-b', 'southamerica-east1-c'],
  'southamerica-west1': ['southamerica-west1-a', 'southamerica-west1-b', 'southamerica-west1-c'],
  
  // Europe
  'europe-west1': ['europe-west1-b', 'europe-west1-c', 'europe-west1-d'],
  'europe-west2': ['europe-west2-a', 'europe-west2-b', 'europe-west2-c'],
  'europe-west3': ['europe-west3-a', 'europe-west3-b', 'europe-west3-c'],
  'europe-west4': ['europe-west4-a', 'europe-west4-b', 'europe-west4-c'],
  'europe-west6': ['europe-west6-a', 'europe-west6-b', 'europe-west6-c'],
  'europe-west8': ['europe-west8-a', 'europe-west8-b', 'europe-west8-c'],
  'europe-west9': ['europe-west9-a', 'europe-west9-b', 'europe-west9-c'],
  'europe-west10': ['europe-west10-a', 'europe-west10-b', 'europe-west10-c'], // Berlin
  'europe-west12': ['europe-west12-a', 'europe-west12-b', 'europe-west12-c'], // Turin
  'europe-north1': ['europe-north1-a', 'europe-north1-b', 'europe-north1-c'],
  'europe-central2': ['europe-central2-a', 'europe-central2-b', 'europe-central2-c'],
  'europe-southwest1': ['europe-southwest1-a', 'europe-southwest1-b', 'europe-southwest1-c'],
  
  // Asia Pacific
  'asia-east1': ['asia-east1-a', 'asia-east1-b', 'asia-east1-c'],
  'asia-east2': ['asia-east2-a', 'asia-east2-b', 'asia-east2-c'],
  'asia-northeast1': ['asia-northeast1-a', 'asia-northeast1-b', 'asia-northeast1-c'],
  'asia-northeast2': ['asia-northeast2-a', 'asia-northeast2-b', 'asia-northeast2-c'],
  'asia-northeast3': ['asia-northeast3-a', 'asia-northeast3-b', 'asia-northeast3-c'],
  'asia-southeast1': ['asia-southeast1-a', 'asia-southeast1-b', 'asia-southeast1-c'],
  'asia-southeast2': ['asia-southeast2-a', 'asia-southeast2-b', 'asia-southeast2-c'],
  'asia-south1': ['asia-south1-a', 'asia-south1-b', 'asia-south1-c'],
  'asia-south2': ['asia-south2-a', 'asia-south2-b', 'asia-south2-c'],
  'australia-southeast1': ['australia-southeast1-a', 'australia-southeast1-b', 'australia-southeast1-c'],
  'australia-southeast2': ['australia-southeast2-a', 'australia-southeast2-b', 'australia-southeast2-c'],

  // Middle East & Africa
  'me-west1': ['me-west1-a', 'me-west1-b', 'me-west1-c'],
  'me-central1': ['me-central1-a', 'me-central1-b', 'me-central1-c'],
  'me-central2': ['me-central2-a', 'me-central2-b', 'me-central2-c'],
  'africa-south1': ['africa-south1-a', 'africa-south1-b', 'africa-south1-c'],
};

export interface RegionMetadata {
  name: string;
  continent: 'Americas' | 'Europe' | 'Asia Pacific' | 'Middle East' | 'Africa';
}

export const REGION_METADATA: Record<string, RegionMetadata> = {
  // Americas
  'us-central1': { name: 'Iowa', continent: 'Americas' },
  'us-east1': { name: 'South Carolina', continent: 'Americas' },
  'us-east4': { name: 'Northern Virginia', continent: 'Americas' },
  'us-east5': { name: 'Columbus', continent: 'Americas' },
  'us-west1': { name: 'Oregon', continent: 'Americas' },
  'us-west2': { name: 'Los Angeles', continent: 'Americas' },
  'us-west3': { name: 'Salt Lake City', continent: 'Americas' },
  'us-west4': { name: 'Las Vegas', continent: 'Americas' },
  'us-south1': { name: 'Dallas', continent: 'Americas' },
  'northamerica-northeast1': { name: 'Montreal', continent: 'Americas' },
  'northamerica-northeast2': { name: 'Toronto', continent: 'Americas' },
  'southamerica-east1': { name: 'Sao Paulo', continent: 'Americas' },
  'southamerica-west1': { name: 'Santiago', continent: 'Americas' },

  // Europe
  'europe-west1': { name: 'Belgium', continent: 'Europe' },
  'europe-west2': { name: 'London', continent: 'Europe' },
  'europe-west3': { name: 'Frankfurt', continent: 'Europe' },
  'europe-west4': { name: 'Netherlands', continent: 'Europe' },
  'europe-west6': { name: 'Zurich', continent: 'Europe' },
  'europe-west8': { name: 'Milan', continent: 'Europe' },
  'europe-west9': { name: 'Paris', continent: 'Europe' },
  'europe-west10': { name: 'Berlin', continent: 'Europe' },
  'europe-west12': { name: 'Turin', continent: 'Europe' },
  'europe-north1': { name: 'Finland', continent: 'Europe' },
  'europe-central2': { name: 'Warsaw', continent: 'Europe' },
  'europe-southwest1': { name: 'Madrid', continent: 'Europe' },

  // Asia Pacific
  'asia-east1': { name: 'Taiwan', continent: 'Asia Pacific' },
  'asia-east2': { name: 'Hong Kong', continent: 'Asia Pacific' },
  'asia-northeast1': { name: 'Tokyo', continent: 'Asia Pacific' },
  'asia-northeast2': { name: 'Osaka', continent: 'Asia Pacific' },
  'asia-northeast3': { name: 'Seoul', continent: 'Asia Pacific' },
  'asia-southeast1': { name: 'Singapore', continent: 'Asia Pacific' },
  'asia-southeast2': { name: 'Jakarta', continent: 'Asia Pacific' },
  'asia-south1': { name: 'Mumbai', continent: 'Asia Pacific' },
  'asia-south2': { name: 'Delhi', continent: 'Asia Pacific' },
  'australia-southeast1': { name: 'Sydney', continent: 'Asia Pacific' },
  'australia-southeast2': { name: 'Melbourne', continent: 'Asia Pacific' },

  // Middle East & Africa
  'me-west1': { name: 'Tel Aviv', continent: 'Middle East' },
  'me-central1': { name: 'Doha', continent: 'Middle East' },
  'me-central2': { name: 'Dammam', continent: 'Middle East' },
  'africa-south1': { name: 'Johannesburg', continent: 'Africa' },
};

export const REGIONS = Object.keys(REGION_CONFIG).sort();

export interface MachineTypeOption {
  id: string;
  name: string;
  family: string;
  series: string;
  cores: number;
  memory: string;
  arch: 'x86' | 'Arm';
}

export const MACHINE_FAMILIES = [
  'All',
  'General Purpose',
  'Compute Optimized',
  'Memory Optimized',
  'Accelerator Optimized',
  'Storage Optimized'
];

/**
 * UTILITY FOR GENERATING MACHINE TYPES
 */
export const generateMachineTypes = (
  series: string,
  family: string,
  arch: 'x86' | 'Arm',
  specs: { suffix: string; cores: number[]; memPerCore: number }[]
): MachineTypeOption[] => {
  return specs.flatMap(spec => 
    spec.cores.map(core => {
        // Handle nice formatting
        let niceSuffix = '';
        if (spec.suffix === 'standard') niceSuffix = 'Standard';
        else if (spec.suffix === 'highmem') niceSuffix = 'HighMem';
        else if (spec.suffix === 'highcpu') niceSuffix = 'HighCPU';
        else niceSuffix = spec.suffix.charAt(0).toUpperCase() + spec.suffix.slice(1);

        return {
            id: `${series.toLowerCase()}-${spec.suffix}-${core}`,
            name: `${series} ${niceSuffix} ${core}`,
            family,
            series,
            cores: core,
            memory: `${Math.round(core * spec.memPerCore)}GB`,
            arch
        };
    })
  );
};

/* --- GENERAL PURPOSE --- */

// E2 (Cost Optimized) - x86 (Intel/AMD)
const E2_SHARED = [
    { id: 'e2-micro', name: 'E2 Micro', family: 'General Purpose', series: 'E2', cores: 2, memory: '1GB', arch: 'x86' },
    { id: 'e2-small', name: 'E2 Small', family: 'General Purpose', series: 'E2', cores: 2, memory: '2GB', arch: 'x86' },
    { id: 'e2-medium', name: 'E2 Medium', family: 'General Purpose', series: 'E2', cores: 2, memory: '4GB', arch: 'x86' },
] as MachineTypeOption[];

const E2_GENERATED = generateMachineTypes('E2', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [2, 4, 8, 16, 32], memPerCore: 4 },
    { suffix: 'highmem', cores: [2, 4, 8, 16], memPerCore: 8 },
    { suffix: 'highcpu', cores: [2, 4, 8, 16, 32], memPerCore: 1 },
]);

// N1 (First Gen) - x86 (Intel Skylake/Haswell/Broadwell)
const N1_GENERATED = generateMachineTypes('N1', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [1, 2, 4, 8, 16, 32, 64, 96], memPerCore: 3.75 },
    { suffix: 'highmem', cores: [2, 4, 8, 16, 32, 64, 96], memPerCore: 6.5 },
    { suffix: 'highcpu', cores: [2, 4, 8, 16, 32, 64, 96], memPerCore: 0.9 },
]);

// N2 (Intel Cascade/Ice Lake) - x86
const N2_GENERATED = generateMachineTypes('N2', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [2, 4, 8, 16, 32, 48, 64, 80, 96, 128], memPerCore: 4 },
    { suffix: 'highmem', cores: [2, 4, 8, 16, 32, 48, 64, 80, 96, 128], memPerCore: 8 },
    { suffix: 'highcpu', cores: [2, 4, 8, 16, 32, 48, 64, 80, 96], memPerCore: 1 },
]);

// N2D (AMD Milan/Rome) - x86
const N2D_GENERATED = generateMachineTypes('N2D', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [2, 4, 8, 16, 32, 48, 64, 80, 96, 128, 224], memPerCore: 4 },
    { suffix: 'highmem', cores: [2, 4, 8, 16, 32, 48, 64, 80, 96], memPerCore: 8 },
    { suffix: 'highcpu', cores: [2, 4, 8, 16, 32, 48, 64, 80, 96, 128, 224], memPerCore: 1 },
]);

// N4 (Titanium - Next Gen) - x86
const N4_GENERATED = generateMachineTypes('N4', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [4, 8, 16, 32, 48, 64, 80], memPerCore: 4 },
    { suffix: 'highmem', cores: [4, 8, 16, 32, 48, 64, 80], memPerCore: 8 },
]);

// T2D (AMD Scale Out) - x86
const T2D_GENERATED = generateMachineTypes('T2D', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [1, 2, 4, 8, 16, 32, 48, 60], memPerCore: 4 },
]);

// T2A (Ampere Altra) - Arm
const T2A_GENERATED = generateMachineTypes('T2A', 'General Purpose', 'Arm', [
    { suffix: 'standard', cores: [1, 2, 4, 8, 16, 32, 48], memPerCore: 4 },
]);

// C3 (Intel Sapphire Rapids) - x86
const C3_GENERATED = generateMachineTypes('C3', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [4, 8, 22, 44, 88, 176], memPerCore: 4 },
    { suffix: 'highmem', cores: [4, 8, 22, 44, 88, 176], memPerCore: 8 },
    { suffix: 'highcpu', cores: [4, 8, 22, 44, 88, 176], memPerCore: 2 },
]);

// C3D (AMD Genoa) - x86
const C3D_GENERATED = generateMachineTypes('C3D', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [4, 8, 16, 30, 60, 180, 360], memPerCore: 4 },
    { suffix: 'highmem', cores: [4, 8, 16, 30, 60, 180, 360], memPerCore: 8 },
    { suffix: 'highcpu', cores: [4, 8, 16, 30, 60, 180, 360], memPerCore: 2 },
]);

// C4 (Intel Emerald Rapids) - x86
const C4_GENERATED = generateMachineTypes('C4', 'General Purpose', 'x86', [
    { suffix: 'standard', cores: [4, 8, 16, 24, 32, 48, 96, 192], memPerCore: 4 },
    { suffix: 'highmem', cores: [4, 8, 16, 24, 32, 48, 96, 192], memPerCore: 8 },
    { suffix: 'highcpu', cores: [4, 8, 16, 24, 32, 48, 96, 192], memPerCore: 2 },
]);

/* --- COMPUTE OPTIMIZED --- */

// C2 (Intel Cascade Lake) - x86
const C2_GENERATED = generateMachineTypes('C2', 'Compute Optimized', 'x86', [
    { suffix: 'standard', cores: [4, 8, 16, 30, 60], memPerCore: 4 },
]);

// C2D (AMD Milan) - x86
const C2D_GENERATED = generateMachineTypes('C2D', 'Compute Optimized', 'x86', [
    { suffix: 'standard', cores: [2, 4, 8, 16, 32, 56, 112], memPerCore: 4 },
    { suffix: 'highmem', cores: [2, 4, 8, 16, 32, 56, 112], memPerCore: 8 },
    { suffix: 'highcpu', cores: [2, 4, 8, 16, 32, 56, 112], memPerCore: 2 },
]);

// C4A (Google Axion - Arm)
const C4A_GENERATED = generateMachineTypes('C4A', 'Compute Optimized', 'Arm', [
    { suffix: 'standard', cores: [1, 2, 4, 8, 16, 32, 48, 72], memPerCore: 4 },
    { suffix: 'highmem', cores: [1, 2, 4, 8, 16, 32, 48, 72], memPerCore: 8 },
    { suffix: 'highcpu', cores: [1, 2, 4, 8, 16, 32, 48, 72], memPerCore: 2 },
]);

// C4D (AMD Next Gen)
const C4D_GENERATED = generateMachineTypes('C4D', 'Compute Optimized', 'x86', [
  { suffix: 'standard', cores: [2, 4, 8, 16, 32, 60, 120, 240, 360], memPerCore: 4 },
  { suffix: 'highmem', cores: [2, 4, 8, 16, 32, 60, 120, 240, 360], memPerCore: 8 },
  { suffix: 'highcpu', cores: [2, 4, 8, 16, 32, 60, 120, 240, 360], memPerCore: 2 },
]);

// H3 (High Performance) - x86
const H3_TYPES = [
    { id: 'h3-standard-88', name: 'H3 Standard 88', family: 'Compute Optimized', series: 'H3', cores: 88, memory: '352GB', arch: 'x86' }
] as MachineTypeOption[];

/* --- ACCELERATOR OPTIMIZED --- */

// A2 (NVIDIA A100)
const A2_TYPES = [
    { id: 'a2-highgpu-1g', name: 'A2 HighGPU 1g', family: 'Accelerator Optimized', series: 'A2', cores: 12, memory: '85GB', arch: 'x86' },
    { id: 'a2-highgpu-2g', name: 'A2 HighGPU 2g', family: 'Accelerator Optimized', series: 'A2', cores: 24, memory: '170GB', arch: 'x86' },
    { id: 'a2-highgpu-4g', name: 'A2 HighGPU 4g', family: 'Accelerator Optimized', series: 'A2', cores: 48, memory: '340GB', arch: 'x86' },
    { id: 'a2-highgpu-8g', name: 'A2 HighGPU 8g', family: 'Accelerator Optimized', series: 'A2', cores: 96, memory: '680GB', arch: 'x86' },
    { id: 'a2-ultragpu-1g', name: 'A2 UltraGPU 1g', family: 'Accelerator Optimized', series: 'A2', cores: 12, memory: '170GB', arch: 'x86' },
    { id: 'a2-ultragpu-2g', name: 'A2 UltraGPU 2g', family: 'Accelerator Optimized', series: 'A2', cores: 24, memory: '340GB', arch: 'x86' },
    { id: 'a2-ultragpu-4g', name: 'A2 UltraGPU 4g', family: 'Accelerator Optimized', series: 'A2', cores: 48, memory: '680GB', arch: 'x86' },
    { id: 'a2-ultragpu-8g', name: 'A2 UltraGPU 8g', family: 'Accelerator Optimized', series: 'A2', cores: 96, memory: '1360GB', arch: 'x86' },
] as MachineTypeOption[];

// A3 (NVIDIA H100)
const A3_TYPES = [
    { id: 'a3-highgpu-8g', name: 'A3 HighGPU 8g', family: 'Accelerator Optimized', series: 'A3', cores: 208, memory: '1872GB', arch: 'x86' },
    { id: 'a3-megagpu-8g', name: 'A3 MegaGPU 8g', family: 'Accelerator Optimized', series: 'A3', cores: 208, memory: '1872GB', arch: 'x86' },
    { id: 'a3-edgegpu-8g', name: 'A3 EdgeGPU 8g', family: 'Accelerator Optimized', series: 'A3', cores: 208, memory: '1872GB', arch: 'x86' },
] as MachineTypeOption[];

// G2 (NVIDIA L4)
const G2_TYPES = [
    { id: 'g2-standard-4', name: 'G2 Standard 4', family: 'Accelerator Optimized', series: 'G2', cores: 4, memory: '16GB', arch: 'x86' },
    { id: 'g2-standard-8', name: 'G2 Standard 8', family: 'Accelerator Optimized', series: 'G2', cores: 8, memory: '32GB', arch: 'x86' },
    { id: 'g2-standard-12', name: 'G2 Standard 12', family: 'Accelerator Optimized', series: 'G2', cores: 12, memory: '48GB', arch: 'x86' },
    { id: 'g2-standard-16', name: 'G2 Standard 16', family: 'Accelerator Optimized', series: 'G2', cores: 16, memory: '64GB', arch: 'x86' },
    { id: 'g2-standard-24', name: 'G2 Standard 24', family: 'Accelerator Optimized', series: 'G2', cores: 24, memory: '96GB', arch: 'x86' },
    { id: 'g2-standard-32', name: 'G2 Standard 32', family: 'Accelerator Optimized', series: 'G2', cores: 32, memory: '128GB', arch: 'x86' },
    { id: 'g2-standard-48', name: 'G2 Standard 48', family: 'Accelerator Optimized', series: 'G2', cores: 48, memory: '192GB', arch: 'x86' },
    { id: 'g2-standard-96', name: 'G2 Standard 96', family: 'Accelerator Optimized', series: 'G2', cores: 96, memory: '384GB', arch: 'x86' },
] as MachineTypeOption[];

/* --- MEMORY OPTIMIZED --- */
const MEM_TYPES = [
    { id: 'm1-megamem-96', name: 'M1 MegaMem 96', family: 'Memory Optimized', series: 'M1', cores: 96, memory: '1433GB', arch: 'x86' },
    { id: 'm1-ultramem-40', name: 'M1 UltraMem 40', family: 'Memory Optimized', series: 'M1', cores: 40, memory: '961GB', arch: 'x86' },
    { id: 'm1-ultramem-80', name: 'M1 UltraMem 80', family: 'Memory Optimized', series: 'M1', cores: 80, memory: '1922GB', arch: 'x86' },
    { id: 'm1-ultramem-160', name: 'M1 UltraMem 160', family: 'Memory Optimized', series: 'M1', cores: 160, memory: '3844GB', arch: 'x86' },
    
    { id: 'm2-megamem-416', name: 'M2 MegaMem 416', family: 'Memory Optimized', series: 'M2', cores: 416, memory: '5888GB', arch: 'x86' },
    { id: 'm2-ultramem-208', name: 'M2 UltraMem 208', family: 'Memory Optimized', series: 'M2', cores: 208, memory: '5888GB', arch: 'x86' },
    { id: 'm2-ultramem-416', name: 'M2 UltraMem 416', family: 'Memory Optimized', series: 'M2', cores: 416, memory: '11776GB', arch: 'x86' },

    { id: 'm3-megamem-64', name: 'M3 MegaMem 64', family: 'Memory Optimized', series: 'M3', cores: 64, memory: '1936GB', arch: 'x86' },
    { id: 'm3-megamem-128', name: 'M3 MegaMem 128', family: 'Memory Optimized', series: 'M3', cores: 128, memory: '3872GB', arch: 'x86' },
    { id: 'm3-ultramem-64', name: 'M3 UltraMem 64', family: 'Memory Optimized', series: 'M3', cores: 64, memory: '3872GB', arch: 'x86' },
    { id: 'm3-ultramem-128', name: 'M3 UltraMem 128', family: 'Memory Optimized', series: 'M3', cores: 128, memory: '7744GB', arch: 'x86' },
] as MachineTypeOption[];

/* --- STORAGE OPTIMIZED --- */
const Z3_GENERATED = generateMachineTypes('Z3', 'Storage Optimized', 'x86', [
  { suffix: 'standard', cores: [88, 176], memPerCore: 8 }, // approximate mem
  { suffix: 'highmem', cores: [88, 176], memPerCore: 12 }
]);

// Comprehensive list of modern GCP Machine Types for Mock Mode
export const MACHINE_TYPES: MachineTypeOption[] = [
    ...E2_SHARED, ...E2_GENERATED,
    ...N1_GENERATED,
    ...N2_GENERATED, ...N2D_GENERATED,
    ...N4_GENERATED,
    ...C2_GENERATED, ...C2D_GENERATED,
    ...C3_GENERATED, ...C3D_GENERATED,
    ...C4_GENERATED, ...C4A_GENERATED, ...C4D_GENERATED,
    ...T2D_GENERATED, ...T2A_GENERATED,
    ...A2_TYPES, ...A3_TYPES, ...G2_TYPES, ...H3_TYPES,
    ...MEM_TYPES,
    ...Z3_GENERATED
];
