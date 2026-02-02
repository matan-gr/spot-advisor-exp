
import { CapacityAdvisorResponse, AppState, GroundingMetadata, Recommendation } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getScoreValue } from './utils';
import { MACHINE_TYPES } from './config';

const getMachineSpecs = (type: string): string => {
    const match = MACHINE_TYPES.find(m => m.id === type);
    if (match) return `${match.cores} vCPU / ${match.memory}`;
    return 'Unknown Specs';
};

const getRiskInfo = (score: number) => {
    if (score < 0.4) return { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2' }; // Red
    if (score < 0.7) return { label: 'CONSTRAINED', color: '#d97706', bg: '#fffbeb' }; // Amber
    if (score < 0.85) return { label: 'GOOD', color: '#2563eb', bg: '#eff6ff' }; // Blue
    return { label: 'OPTIMAL', color: '#16a34a', bg: '#f0fdf4' }; // Green
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateCSV = (data: CapacityAdvisorResponse, state: AppState): string => {
  const headers = ['Rank', 'Option', 'Location(s)', 'Machine Type', 'Specs', 'Provisioning Model', 'Obtainability Score', 'Risk Level', 'Uptime Score', 'Total VM Count'];
  const rows = data.recommendations.map((rec, idx) => {
       const obt = getScoreValue(rec, 'obtainability');
       const up = getScoreValue(rec, 'uptime');
       const zones = (rec.shards || []).map(s => {
           const z = (s.zone || s.location || '').split('/').pop();
           const count = s.instanceCount ?? s.count;
           return count ? `${z} (${count})` : z;
       }).join('; ');
       
       const totalCount = (rec.shards || []).reduce((acc, s) => acc + (s.instanceCount ?? s.count ?? 0), 0);
       const machineTypes = [...new Set((rec.shards || []).map(s => s.machineType))];
       const specs = machineTypes.map(t => getMachineSpecs(t)).join('; ');
       const risk = getRiskInfo(obt).label;
       
       return [
        idx + 1,
        `Option ${idx + 1}`,
        zones,
        machineTypes.join('; '),
        specs,
        'SPOT',
        obt.toFixed(2),
        risk,
        up.toFixed(2),
        totalCount
      ].join(',')
  });

  return [headers.join(','), ...rows].join('\n');
};

export const generateComparisonCSV = (items: any[]): string => {
  const headers = ['Metric', ...items.map(item => item.label)];
  
  const getTopScore = (result: any) => {
      if (!result.recommendations || result.recommendations.length === 0) return 0;
      return getScoreValue(result.recommendations[0], 'obtainability');
  };

  const getTopUptime = (result: any) => {
      if (!result.recommendations || result.recommendations.length === 0) return 0;
      return getScoreValue(result.recommendations[0], 'uptime');
  };

  const rows = [
      ['Region', ...items.map(item => item.config.region)],
      ['Machine Type', ...items.map(item => item.config.machineType)],
      ['Workload Profile', ...items.map(item => item.config.workloadProfile || 'N/A')],
      ['Growth Scenario', ...items.map(item => item.config.growthScenario || 'N/A')],
      ['Obtainability Score', ...items.map(item => getTopScore(item.result).toFixed(0))],
      ['Uptime Score', ...items.map(item => getTopUptime(item.result).toFixed(2))],
      ['Placement Options', ...items.map(item => item.result.recommendations ? item.result.recommendations.length : 0)]
  ];

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const generateHTML = (data: CapacityAdvisorResponse, state: AppState, groundingData: GroundingMetadata | null): string => {
  const date = new Date().toLocaleString();
  const topRec = data.recommendations[0];
  const topScore = getScoreValue(topRec, 'obtainability');
  const topZones = (topRec.shards || []).map(s => (s.zone || s.location || '').split('/').pop()).join(', ');
  const topRisk = getRiskInfo(topScore);
  
  // Generate Provisioning Command for Top Rec
  const randomId = Date.now().toString().slice(-4);
  const primaryShard = topRec.shards?.[0];
  const totalCount = (topRec.shards || []).reduce((acc, s) => acc + (s.instanceCount ?? s.count ?? 0), 0);
  const isMultiZone = (topRec.shards || []).length > 1;
  
  let provisioningCommand = '';
  if (isMultiZone) {
      const commands = (topRec.shards || []).map((s, i) => {
          const z = (s.location || '').split('/').pop() || 'unknown';
          return `gcloud compute instances create spot-${randomId}-${i+1} \\\n  --zone=${z} \\\n  --machine-type=${primaryShard?.machineType} \\\n  --provisioning-model=SPOT \\\n  --count=${s.count} \\\n  --project=${state.project} &`;
      });
      provisioningCommand = `# Provision across multiple zones (Bash background jobs)\n${commands.join('\n\n')}\n\nwait\necho "All Spot requests submitted."`;
  } else {
      provisioningCommand = `# Provision single-zone Spot VMs\ngcloud compute instances create spot-${randomId} \\\n  --project=${state.project} \\\n  --zone=${topZones} \\\n  --machine-type=${primaryShard?.machineType} \\\n  --provisioning-model=SPOT \\\n  --count=${totalCount}`;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Spot Capacity Report - ${state.project}</title>
        <style>
          :root { --primary: #4f46e5; --bg: #f8fafc; --text: #1e293b; --border: #e2e8f0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: var(--text); line-height: 1.6; background: var(--bg); max-width: 1200px; margin: 0 auto; }
          
          /* Header */
          header { margin-bottom: 40px; border-bottom: 2px solid var(--border); padding-bottom: 20px; display: flex; justify-content: space-between; items-align: flex-end; }
          h1 { color: var(--primary); margin: 0; font-size: 28px; letter-spacing: -0.5px; }
          .meta-date { color: #64748b; font-size: 14px; }

          /* Cards */
          .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; border: 1px solid var(--border); }
          h2 { font-size: 18px; margin-top: 0; margin-bottom: 16px; color: #0f172a; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
          
          /* Metadata Grid */
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
          .field { display: flex; flex-direction: column; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
          .value { font-weight: 500; font-size: 15px; }

          /* Top Rec Highlight */
          .highlight-box { background: linear-gradient(to right, #eef2ff, #fff); border-left: 4px solid var(--primary); }
          .score-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: ${topRisk.bg}; color: ${topRisk.color}; font-weight: bold; font-size: 14px; border: 1px solid ${topRisk.color}20; }
          
          /* Code Block */
          pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; font-family: "JetBrains Mono", monospace; margin: 0; }

          /* Table */
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { text-align: left; background: #f1f5f9; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 2px solid var(--border); }
          td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: #334155; vertical-align: top; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: #f8fafc; }
          .mono { font-family: "JetBrains Mono", monospace; font-size: 13px; }
          .risk-tag { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }

          /* Insights */
          .insight { background: #f0fdf4; border: 1px solid #bbf7d0; }
          .insight-content { white-space: pre-wrap; font-size: 15px; }
          .sources { font-size: 12px; color: #64748b; margin-top: 16px; padding-top: 12px; border-top: 1px solid #bbf7d0; }

          /* Footer */
          footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid var(--border); padding-top: 20px; }
        </style>
      </head>
      <body>
        <header>
            <div>
                <h1>Spot Capacity Advisor Report</h1>
                <div class="meta-date">Generated on ${date}</div>
            </div>
        </header>

        <div class="card">
            <h2>Analysis Parameters</h2>
            <div class="grid">
                <div class="field"><span class="label">Project ID</span><span class="value mono">${state.project}</span></div>
                <div class="field"><span class="label">Region</span><span class="value mono">${state.region}</span></div>
                <div class="field"><span class="label">Machine Type</span><span class="value mono">${state.selectedMachineType}</span></div>
                <div class="field"><span class="label">Target Size</span><span class="value">${state.size} VMs</span></div>
                <div class="field"><span class="label">Shape</span><span class="value">${state.targetShape}</span></div>
            </div>
        </div>

        <div class="card highlight-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="margin:0; border:none; padding:0;">Top Recommendation</h2>
                <span class="score-badge">${topRisk.label}: ${(topScore * 100).toFixed(0)}% Obtainability</span>
            </div>
            <div class="grid" style="margin-bottom: 20px;">
                <div class="field"><span class="label">Recommended Zone(s)</span><span class="value mono">${topZones}</span></div>
                <div class="field"><span class="label">Strategy</span><span class="value">${isMultiZone ? 'Multi-Zone Distribution' : 'Single Zone'}</span></div>
                <div class="field"><span class="label">Est. Reliability</span><span class="value">${(getScoreValue(topRec, 'uptime') * 100).toFixed(0)}%</span></div>
                <div class="field"><span class="label">Specs</span><span class="value mono">${getMachineSpecs(primaryShard?.machineType || '')}</span></div>
            </div>
            <div>
                <div class="label" style="margin-bottom:8px;">Provisioning Command</div>
                <pre>${provisioningCommand}</pre>
            </div>
        </div>

        <div class="card">
            <h2>Placement Options</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Zone Breakdown</th>
                  <th>Machine Type</th>
                  <th>Specs</th>
                  <th>Risk Level</th>
                  <th>Obtainability</th>
                  <th>Reliability</th>
                </tr>
              </thead>
              <tbody>
                ${data.recommendations.map((rec, idx) => {
                   const obt = getScoreValue(rec, 'obtainability');
                   const up = getScoreValue(rec, 'uptime');
                   const zones = (rec.shards || []).map(s => {
                       const z = (s.zone || s.location || '').split('/').pop();
                       const count = s.instanceCount ?? s.count;
                       return count ? `${z} <b>(${count})</b>` : z;
                   }).join('<br>');
                   
                   const totalCount = (rec.shards || []).reduce((acc, s) => acc + (s.instanceCount ?? s.count ?? 0), 0);
                   const machineTypes = [...new Set((rec.shards || []).map(s => s.machineType))];
                   const specs = machineTypes.map(t => getMachineSpecs(t)).join('<br>');
                   const risk = getRiskInfo(obt);

                   return `<tr>
                      <td><strong>#${idx + 1}</strong></td>
                      <td class="mono">${zones}</td>
                      <td class="mono">${machineTypes.join('<br>')}</td>
                      <td class="mono" style="font-size:11px; color:#64748b;">${specs}</td>
                      <td><span class="risk-tag" style="background:${risk.bg}; color:${risk.color};">${risk.label}</span></td>
                      <td><strong>${(obt * 100).toFixed(0)}%</strong></td>
                      <td>${(up * 100).toFixed(0)}%</td>
                   </tr>`;
                }).join('')}
              </tbody>
            </table>
        </div>

        ${groundingData ? `
          <div class="card insight">
            <h2>AI Advisor Insights</h2>
            <div class="insight-content">${groundingData.insight.replace(/\*\*/g, '')}</div>
            ${groundingData.sources.length > 0 ? `<div class="sources"><strong>Sources:</strong> ${groundingData.sources.map(s => `<a href="${s.uri}" target="_blank" style="color:#4f46e5; text-decoration:none;">${s.title}</a>`).join(', ')}</div>` : ''}
          </div>
        ` : ''}

        <footer>
            Generated by Google Cloud Spot Capacity Advisor • Confidential
        </footer>
      </body>
    </html>
  `;
};

/**
 * Aggressively sanitizes text for jsPDF which only supports basic ASCII/Latin-1 by default.
 * Removes emojis, replaces smart quotes, and formats Markdown structure.
 */
const cleanMarkdownForPDF = (text: string): string => {
  if (!text) return '';

  let cleaned = text
    // 1. Remove Emojis
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    // 2. Normalize Quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // 3. Remove Bold/Italic markers but keep text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // 4. Format Headers (Just strip hashes, renderer handles bolding)
    .replace(/^###\s+(.+)$/gm, '\n$1') 
    .replace(/^##\s+(.+)$/gm, '\n$1')
    // 5. Format Lists
    .replace(/^\s*[\-\*]\s+/gm, '• ')
    // 6. Format Blockquotes
    .replace(/^>\s?/gm, '')
    // 7. Flatten Tables - REMOVED to allow autoTable detection
    // .replace(/^\|/gm, '')
    // .replace(/\|$/gm, '')
    // .replace(/\|/g, '   ')
    .trim();

  return cleaned;
};

export const generateJSON = (data: CapacityAdvisorResponse, state: AppState, groundingData: GroundingMetadata | null): string => {
  const exportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      project: state.project,
      region: state.region,
      machineType: state.selectedMachineType,
      targetSize: state.size,
      targetShape: state.targetShape
    },
    recommendations: data.recommendations.map(rec => ({
      shards: (rec.shards || []).map(shard => ({
        zone: (shard.zone || shard.location || '').split('/').pop(),
        machineType: shard.machineType,
        count: shard.instanceCount ?? shard.count,
        provisioningModel: shard.provisioningModel
      })),
      scores: rec.scores
    })),
    insights: groundingData ? {
      summary: groundingData.insight,
      sources: groundingData.sources.map(s => ({ title: s.title, uri: s.uri }))
    } : null
  };

  return JSON.stringify(exportData, null, 2);
};

export const generatePDF = (data: CapacityAdvisorResponse, state: AppState, groundingData: GroundingMetadata | null) => {
  const doc = new jsPDF();
  
  // --- Header Bar ---
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, 210, 20, 'F');
  
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Spot Capacity Advisor Report', 14, 13);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), 195, 13, { align: 'right' });

  // --- Metadata Section ---
  let currentY = 35;
  
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Parameters', 14, currentY);
  
  currentY += 8;
  
  // Metadata Grid
  const metaLabels = ['Project ID', 'Region', 'Machine Type', 'Target Size'];
  const metaValues = [state.project, state.region, state.selectedMachineType, `${state.size} VMs`];
  
  doc.setFontSize(9);
  
  // Draw 2x2 Grid
  metaLabels.forEach((label, i) => {
      const x = i % 2 === 0 ? 14 : 110;
      const y = currentY + (Math.floor(i / 2) * 12);
      
      doc.setTextColor(100, 116, 139); // Label color
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), x, y);
      
      doc.setTextColor(15, 23, 42); // Value color
      doc.setFont('helvetica', 'normal');
      doc.text(metaValues[i], x, y + 5);
  });
  
  currentY += 30;

  // --- Top Recommendation Box ---
  const topRec = data.recommendations[0];
  const topScore = getScoreValue(topRec, 'obtainability');
  const topZones = (topRec.shards || []).map(s => (s.zone || s.location || '').split('/').pop()).join(', ');
  const topRisk = getRiskInfo(topScore);
  
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(22, 163, 74); // Green 600
  doc.roundedRect(14, currentY, 182, 35, 2, 2, 'FD');
  
  doc.setTextColor(21, 128, 61); // Green 700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Top Recommendation', 20, currentY + 8);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`Zone(s): ${topZones}`, 20, currentY + 18);
  doc.text(`Obtainability: ${(topScore * 100).toFixed(0)}% (${topRisk.label})`, 20, currentY + 26);
  
  // Provisioning Command
  const randomId = Date.now().toString().slice(-4);
  const primaryShard = topRec.shards?.[0];
  const totalCount = (topRec.shards || []).reduce((acc, s) => acc + (s.instanceCount ?? s.count ?? 0), 0);
  const isMultiZone = (topRec.shards || []).length > 1;
  
  let provisioningCommand = '';
  if (isMultiZone) {
      provisioningCommand = `gcloud compute instances create spot-${randomId}-1 --zone=${(topRec.shards?.[0]?.location || '').split('/').pop()} ... (Multi-zone)`;
  } else {
      provisioningCommand = `gcloud compute instances create spot-${randomId} --project=${state.project} --zone=${topZones} --machine-type=${primaryShard?.machineType} --provisioning-model=SPOT --count=${totalCount}`;
  }
  
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const splitCommand = doc.splitTextToSize(provisioningCommand, 100);
  doc.text(splitCommand, 100, currentY + 18);
  
  currentY += 45;

  // --- Table Data ---
  const tableRows = data.recommendations.map((rec, idx) => {
       const obt = getScoreValue(rec, 'obtainability');
       const up = getScoreValue(rec, 'uptime');
       const zones = (rec.shards || []).map(s => {
           const z = (s.zone || s.location || '').split('/').pop();
           const count = s.instanceCount ?? s.count;
           return count ? `${z} (${count})` : z;
       }).join('\n');
       
       const machineTypes = [...new Set((rec.shards || []).map(s => s.machineType))];
       const specs = machineTypes.map(t => getMachineSpecs(t)).join('\n');
       const risk = getRiskInfo(obt).label;

       return [
        `#${idx + 1}`,
        zones || 'Unknown',
        machineTypes.join('\n'),
        specs,
        risk,
        (obt * 100).toFixed(0) + '%',
        (up * 100).toFixed(0) + '%'
      ];
  });

  // Recommendations Table
  autoTable(doc, {
    startY: currentY,
    head: [['Rank', 'Zone Breakdown', 'Machine Type', 'Specs', 'Risk', 'Obtainability', 'Reliability']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', lineColor: [226, 232, 240], lineWidth: 0.1 },
    styles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.1, valign: 'top' },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 15 },
        1: { cellWidth: 40 },
        4: { fontStyle: 'bold' },
        5: { fontStyle: 'bold', textColor: [22, 163, 74] }, // Green
    },
    didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
            const risk = data.cell.raw as string;
            if (risk === 'CRITICAL') data.cell.styles.textColor = [220, 38, 38];
            else if (risk === 'CONSTRAINED') data.cell.styles.textColor = [217, 119, 6];
            else if (risk === 'GOOD') data.cell.styles.textColor = [37, 99, 235];
            else data.cell.styles.textColor = [22, 163, 74];
        }
    }
  });

  // --- Insights Section ---
  let finalY = (doc as any).lastAutoTable.finalY || currentY;
  
  if (groundingData && groundingData.insight) {
      if (finalY > 200) {
          doc.addPage();
          finalY = 20;
      } else {
          finalY += 15;
      }

      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.setFont('helvetica', 'bold');
      doc.text('Advisor Insights', 14, finalY);
      finalY += 10;

      // --- TL;DR Extraction & Rendering ---
      const tldrMatch = groundingData.insight.match(/### ⚡ TL;DR Summary\n([\s\S]*?)(?=###|$)/);
      let mainText = groundingData.insight;

      if (tldrMatch) {
          const tldrText = cleanMarkdownForPDF(tldrMatch[1]);
          mainText = mainText.replace(tldrMatch[0], ''); // Remove TL;DR from main text

          // Render TL;DR Box
          doc.setFillColor(240, 253, 244); // Light green bg
          doc.setDrawColor(22, 163, 74); // Green border
          doc.roundedRect(14, finalY, 182, 25, 2, 2, 'FD');
          
          doc.setFontSize(10);
          doc.setTextColor(21, 128, 61); // Green text
          doc.setFont('helvetica', 'bold');
          doc.text("EXECUTIVE SUMMARY", 20, finalY + 8);
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0);
          const splitTldr = doc.splitTextToSize(tldrText, 170);
          doc.text(splitTldr, 20, finalY + 16);
          
          finalY += 35;
      }

      // --- Main Insight Rendering ---
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.setFont('helvetica', 'normal'); // Switch to Helvetica for better readability
      
      const cleanText = cleanMarkdownForPDF(mainText);
      const lines = cleanText.split('\n');
      
      const lineHeight = 6; // Increased line height
      let inTable = false;
      let tableData: string[][] = [];
      let tableHeaders: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Table Detection
        if (line.trim().startsWith('|')) {
            if (!inTable) {
                inTable = true;
                // Assuming first line is header
                tableHeaders = line.split('|').map(c => c.trim()).filter(c => c);
                // Skip separator line if it exists next
                if (lines[i+1] && lines[i+1].includes('---')) {
                    i++;
                }
            } else {
                const row = line.split('|').map(c => c.trim()).filter(c => c);
                if (row.length > 0) tableData.push(row);
            }
            continue;
        } else if (inTable) {
            // End of table
            inTable = false;
            if (tableHeaders.length > 0 && tableData.length > 0) {
                 autoTable(doc, {
                    startY: finalY,
                    head: [tableHeaders],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3 },
                    margin: { left: 14, right: 14 }
                 });
                 finalY = (doc as any).lastAutoTable.finalY + 10;
                 tableData = [];
                 tableHeaders = [];
            }
        }

        // Pagination Check
        if (finalY > 275) {
          doc.addPage();
          finalY = 20;
        }

        // Header Detection (Lines followed by separators or starting with specific patterns)
        if (line.includes('----') || line.includes('====')) {
             // Skip the separator line itself, just add spacing
             continue;
        }
        
        // Bold/Header Logic (Heuristic based on cleaner output)
        const isHeader = line === line.toUpperCase() && line.length > 5 && !line.includes('•');
        const isList = line.trim().startsWith('•');
        
        if (isHeader) {
            finalY += 4; // Space before header
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229); // Indigo for headers
            doc.text(line, 14, finalY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50); // Reset color
            finalY += lineHeight + 2;
        } else if (isList) {
            // Indent list items
            const splitLine = doc.splitTextToSize(line, 170);
            doc.text(splitLine, 20, finalY); // Indent 6mm
            finalY += (splitLine.length * lineHeight);
        } else {
            // Standard Paragraph
            // Handle inline bolding simple case: **text**
            const parts = line.split(/(\*\*.*?\*\*)/g);
            let currentX = 14;
            
            // If line is too long, we fall back to standard splitTextToSize (no bolding support for simplicity in wrapping)
            if (doc.getStringUnitWidth(line) * 10 > 180) {
                 const splitLine = doc.splitTextToSize(line, 180);
                 doc.text(splitLine, 14, finalY);
                 finalY += (splitLine.length * lineHeight);
            } else {
                parts.forEach(part => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        doc.setFont('helvetica', 'bold');
                        const text = part.slice(2, -2);
                        doc.text(text, currentX, finalY);
                        currentX += doc.getTextWidth(text);
                        doc.setFont('helvetica', 'normal');
                    } else {
                        doc.text(part, currentX, finalY);
                        currentX += doc.getTextWidth(part);
                    }
                });
                finalY += lineHeight;
            }
        }
      }
      
      // Flush any remaining table
      if (inTable && tableHeaders.length > 0) {
         autoTable(doc, {
            startY: finalY,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
         });
         finalY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Sources
      if (groundingData.sources.length > 0) {
          if (finalY > 270) {
             doc.addPage();
             finalY = 20;
          } else {
             finalY += 10;
          }

          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'italic');
          const sources = "Sources: " + groundingData.sources.map(s => s.title).join(', ');
          const splitSources = doc.splitTextToSize(sources, 180);
          doc.text(splitSources, 14, finalY);
      }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
    doc.text('Generated by Spot Capacity Advisor', 14, 290);
  }

  doc.save(`capacity-report-${state.project}.pdf`);
};
