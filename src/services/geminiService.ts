
import { GoogleGenAI } from "@google/genai";
import { AppState, CapacityAdvisorResponse } from "../types";
import { MachineTypeOption } from "../config";
import { getScoreValue } from "../utils";

export type StreamChunk = 
  | { type: 'text'; content: string }
  | { type: 'metadata'; content: any } // keeping content loose for internal SDK types
  | { type: 'debug'; content: { prompt: string; model: string } };

export async function* streamComparisonInsights(
  items: any[]
): AsyncGenerator<StreamChunk, void, unknown> {
  const modelName = 'gemini-2.5-flash';
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // 1. Construct Comparison Summary
  let comparisonTable = "| Option | Region | Machine Type | Score | Est. Uptime |\n| :--- | :--- | :--- | :--- | :--- |\n";
  
  items.forEach((item, index) => {
      const score = Math.round(getScoreValue(item.result.recommendations?.[0], 'obtainability') * 100);
      const uptime = Math.round(getScoreValue(item.result.recommendations?.[0], 'uptime') * 100);
      comparisonTable += `| **Option ${index + 1}** (${item.label}) | ${item.config.region} | ${item.config.machineType} | **${score}%** | ${uptime}% |\n`;
  });

  const prompt = `
### SYSTEM INSTRUCTION
You are a **Google Cloud Principal Architect** specializing in high-performance computing and spot capacity optimization.
Your task is to **COMPARE** the following capacity scenarios and recommend the best strategy.

### COMPARISON DATA
${comparisonTable}

### CONTEXT
- **Current Date:** ${dateString}
- **Goal:** Select the best option for a ${items[0].config.workloadProfile || 'generic'} workload.
- **Growth Scenario:** ${items[0].config.growthScenario || 'steady'}

### RESPONSE TEMPLATE (STRICT MARKDOWN)

### 🏆 The Winner
**Option X** is the clear winner due to [Reason].

### ⚖️ Trade-off Analysis
- **Option 1 vs Option 2:** [Compare specific metrics like Score vs Region latency vs Machine Type performance]
- **Risk Assessment:** [Highlight which option has higher preemption risk]

### 🧠 Architect's Recommendation
[Provide a final strategic recommendation. E.g., "If latency is key, stick with Option 1, but if cost/availability is paramount, Option 2 is superior."]
`;

  // Yield debug info
  yield { type: 'debug', content: { prompt, model: modelName } };

  const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

  if (!apiKey) {
      yield { type: 'text', content: "Configuration Error: API Key is missing." };
      return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { type: 'text', content: chunk.text };
      }
    }
  } catch (error: any) {
      yield { type: 'text', content: `\n\n**Error retrieving comparison insights:** ${error.message || 'Unknown error.'}` };
  }
}

export async function* streamGroundingInsights(
  state: AppState,
  machineSpecs: MachineTypeOption | undefined,
  apiResponse?: CapacityAdvisorResponse | null
): AsyncGenerator<StreamChunk, void, unknown> {
  // Using 'gemini-2.5-flash' as the stable Flash model.
  const modelName = 'gemini-2.5-flash';
  
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeString = today.toLocaleTimeString('en-US', { timeZoneName: 'short' });
  
  // Calculate Quota Requirements based on real specs
  const vCPUsPerVM = machineSpecs?.cores || 2; // default safe fallback if undefined
  const memoryPerVM = machineSpecs?.memory || 'Unknown';
  const family = machineSpecs?.family || 'General Purpose';
  const totalVCPUs = vCPUsPerVM * state.size;
  const isHighQuota = totalVCPUs > 32; 

  // --- NEW: Serialize API Data for Gemini ---
  let apiDataSummary = "No API data available yet.";
  let topObtainability = 0;
  let topUptime = 0;
  let bestZone = "Unknown";
  let bestOptionIndex = 0;

  // Use the explicitly passed API response if available, otherwise fallback to state (though state might be stale)
  const resultToUse = apiResponse || state.result;

  if (resultToUse && resultToUse.recommendations.length > 0) {
      const recs = resultToUse.recommendations.slice(0, 5); // Take top 5
      const tableRows = recs.map((rec: any, i: number) => {
          const obt = Math.round(getScoreValue(rec, 'obtainability') * 100);
          const upt = Math.round(getScoreValue(rec, 'uptime') * 100);
          const zones = (rec.shards || []).map((s: any) => (s.location || '').split('/').pop()).filter(Boolean).join(', ');
          
          if (i === 0) {
              topObtainability = obt;
              topUptime = upt;
              bestZone = zones;
              bestOptionIndex = 1;
          }

          return `| Option ${i+1} | ${zones} | ${obt}% | ${upt}% |`;
      }).join('\n');

      apiDataSummary = `
### 📊 REAL-TIME API DATA (Source: Google Cloud Capacity Advisor)
The following data was just retrieved from the Compute Engine API. **YOU MUST USE THIS DATA IN YOUR ANALYSIS.**

| Option | Zone(s) | Obtainability Score | Est. Uptime |
| :--- | :--- | :--- | :--- |
${tableRows}

**Key Metrics:**
- **Best Option:** Option ${bestOptionIndex} (${bestZone})
- **Best Obtainability:** ${topObtainability}%
- **Best Uptime:** ${topUptime}%
`;
  }

  const isConstrained = topObtainability < 70;

  const prompt = `
### SYSTEM INSTRUCTION
You are a **Google Cloud Principal Architect** and **Senior Cloud Technical Account Manager** acting as a Spot Capacity Advisor.
Your mandate is to validate the user's capacity request against **REAL-TIME API DATA** and **official Google Cloud sources**.
**Double-check your assumptions** using the provided tools. Do not guess—verify.

${apiDataSummary}

**MANDATORY RESEARCH STEPS (Use Google Search):**
1.  **Service Health:** Search for "Google Cloud Service Health Dashboard ${state.region} compute engine" to check for active incidents.
2.  **Product Availability:** Search for "${state.selectedMachineType} availability ${state.region} google cloud documentation" to confirm it exists in this region.
3.  **Regional Events:** Search for "Tech conferences holidays weather ${state.region} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}" to assess demand spikes.
4.  **Official Comms:** Search for "Google Cloud Compute Engine blog posts ${today.getFullYear()}" for recent spot updates.
5.  **Alternatives Analysis:** ${isConstrained ? `**CRITICAL:** The API reports low obtainability (${topObtainability}%). Search for "Google Cloud Compute Engine machine type comparison ${family}" to find modern alternatives (e.g., C3, C4, N4, C4A, N2D). Compare their Spot availability and price-performance.` : `Search for "Google Cloud Compute Engine machine type comparison ${family}" to validate if this is the best choice.`}

### REAL-TIME CONTEXT
- **Current Time:** ${dateString} ${timeString}
- **Request:** ${state.size} instances of **${state.selectedMachineType}** in **${state.region}**.
- **Deployment Type:** ${state.targetShape} (Affects distribution strategy).
- **Hardware Specs:** ${vCPUsPerVM} vCPU / ${memoryPerVM} RAM per VM (${family}).
- **Total Quota Impact:** This request consumes **${totalVCPUs} vCPUs** of Spot Quota.
- **Workload Profile:** ${state.workloadProfile.toUpperCase()} (Affects tolerance for interruptions).
- **Growth Scenario:** ${state.growthScenario.toUpperCase()} (Affects scaling strategy).

### RESPONSE FORMATTING RULES (STRICT MARKDOWN)
- **Tables:** Must start and end with pipes (|).
- **Headers:** Use \`###\` for section headers.
- **Lists:** Use \`-\` for all bullet points. Do NOT use \`*\`.
- **No JSON:** Do not output JSON. Output formatted Markdown.

### RESPONSE TEMPLATE

### ⚡ TL;DR Summary
[Provide a 2-sentence executive summary based **strictly** on the API DATA above and your **Verification & Grounding** findings (e.g., service health, regional events). Explicitly recommend **Option ${bestOptionIndex}** as the best placement strategy due to its ${topObtainability}% obtainability score. Start with "Feasible", "Risky", or "Not Recommended".]

### 🛡️ Executive Assessment
> **Verdict:** ${isConstrained ? 'Caution / No-Go' : 'Go'}
[Synthesize the risk. **Explicitly reference the ${topObtainability}% obtainability score** for Option ${bestOptionIndex}. Mention if the required **${totalVCPUs} vCPUs** exceeds typical default quotas. Compare Spot vs On-Demand availability.]

### 🔮 Predictive Scaling & Optimization
*(Based on ${state.workloadProfile} workload with ${state.growthScenario} growth)*
- **Scaling Strategy:** [Recommend specific autoscaling policies (e.g., Target CPU vs. Custom Metric) suitable for ${state.workloadProfile} workloads.]
- **Capacity Planning:** [Predict potential bottlenecks for ${state.growthScenario} growth. E.g., if 'Viral', suggest pre-warming or reservation usage.]
- **Spot Fluctuation Handling:** [Advice on handling preemptions for this specific workload type. E.g., for Batch, use checkpointing; for Serving, use surplus buffer.]

### 🔍 Verification & Grounding
- **GCP Health Status:** [Report findings from Service Health Dashboard search]
- **Regional Demand:** [Mention identified events/holidays or "No major events detected"]
- **Docs Validation:** [Confirm if ${state.selectedMachineType} is standard in ${state.region} based on docs]

### 📊 Quota & Constraint Analysis
| Constraint | Required | Risk Analysis |
| :--- | :--- | :--- |
| **Spot vCPU Quota** | **${totalVCPUs}** vCPUs | ${isHighQuota ? '🚨 **HIGH RISK** (Check Limit)' : '✅ Low Risk (Standard)'} |
| **Instance Count** | ${state.size} VMs | ${state.size > 50 ? '⚠️ High Contention' : '✅ Manageable'} |
| **Region** | ${state.region} | [Comment on region liquidity/size] |

### ⚔️ Battlecard: Alternatives (If Constrained)
${isConstrained ? `*(The API indicates constrained capacity. Use this table to suggest better options.)*` : `*(Capacity looks good, but here are alternatives for optimization.)*`}

| Alternative | Generation | Performance | Cost/Spot | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **[Alt 1]** | [e.g. N4/C4] | [Comparison vs ${state.selectedMachineType}] | [Lower/Higher] | [Use Case] |
| **[Alt 2]** | [e.g. N2D/T2D] | [Comparison vs ${state.selectedMachineType}] | [Lower/Higher] | [Use Case] |

**Architect's Note:** [Briefly explain the trade-offs, e.g., "Moving to N2D offers better Spot availability due to AMD EPYC density, while C4 provides better per-core performance if budget allows."]

### 🛠️ Strategic Workarounds
- **Protocol 1: Diversify Hardware:**
    - *Alternative:* Use **[Suggest alternative family from Battlecard]** which often has deeper spot pools than ${state.selectedMachineType}.
- **Protocol 2: Architecture Adaptation:**
    - *Managed Instance Groups (MIGs):* Configure a MIG with multiple instance templates to fallback automatically.
- **Protocol 3: Spatial Distribution:**
    - *Region:* If ${state.region} is constrained, deploy payload to **[Suggest nearby region]**.
    - *Zone:* Enforce '${state.targetShape}' shape to spread the **${totalVCPUs} vCPU** load.
- **Protocol 4: Quota Management:**
    - *Action:* Request a quota increase for "Spot Preemptible vCPUs" in ${state.region} immediately if limit is < ${totalVCPUs}.

### 📋 Pre-Flight Checklist
- [ ] **Quota Verification:** Check "Spot Preemptible vCPUs" limit in IAM & Admin > Quotas.
- [ ] **Fault Tolerance:** Ensure app handles \`SIGTERM\` for graceful shutdown.
- [ ] **Fallback Strategy:** Verify On-Demand or Reservation budget is approved.
`;

  // Yield debug info first
  yield { type: 'debug', content: { prompt, model: modelName } };

  // Robustly retrieve API Key (Support both Vite env and standard process.env)
  const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

  if (!apiKey) {
      yield { type: 'text', content: "Configuration Error: API Key is missing. Please ensure VITE_API_KEY or process.env.API_KEY is set." };
      return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7, 
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { type: 'text', content: chunk.text };
      }
      
      const groundingMeta = chunk.candidates?.[0]?.groundingMetadata;
      if (groundingMeta) {
        yield { type: 'metadata', content: groundingMeta };
      }
    }
  } catch (error: any) {
    // Robust Error Extraction
    const errorMsg = error.message || error.error?.message || error.toString();
    const errorStatus = error.status || error.statusCode || error.code || error.error?.code || error.error?.status;
    const errorStr = JSON.stringify(error);
    
    // 2. Check for Quota/Rate Limit (429)
    const isQuotaError = 
        errorStatus == 429 || 
        errorStatus === 'RESOURCE_EXHAUSTED' ||
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.includes('quota') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('"code":429') ||
        errorStr.includes('"status":"RESOURCE_EXHAUSTED"');

    if (isQuotaError) {
        console.warn("Gemini Quota Exceeded:", errorMsg);
        yield { 
            type: 'text', 
            content: `\n\n### ⚠️ AI Analysis Unavailable\n\n**Reason:** The daily quota for the AI model has been exceeded.\n\n**Action:** Please try again later or check your billing details if you are the project owner.\n\n> *Note: Basic capacity data is still accurate. Only the AI-generated insights are affected.*` 
        };
        return;
    }

    console.error("Gemini Search Grounding Error:", error);

    // 3. Handle Service Unavailable (503)
    const isServiceUnavailable = 
        errorStatus == 503 ||
        errorStatus === 'UNAVAILABLE' ||
        errorMsg.includes('503') ||
        errorMsg.includes('Service Unavailable') ||
        errorMsg.includes('Overloaded') ||
        errorStr.includes('"code":503');

    if (isServiceUnavailable) {
        yield { 
            type: 'text', 
            content: `\n\n### ⚠️ AI Service Temporarily Unavailable\n\n**Reason:** The AI service is currently overloaded or experiencing downtime.\n\n**Action:** Please try again in a few minutes.\n\n> *Note: Basic capacity data is still accurate.*` 
        };
        return;
    }

    // 4. Generic Error Fallback
    yield { type: 'text', content: `\n\n**Error retrieving insights:** ${errorMsg || 'Unknown error occurred.'}` };
  }
}
