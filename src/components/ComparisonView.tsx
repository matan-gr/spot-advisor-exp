import React, { useEffect } from 'react';
import { CapacityAdvisorResponse } from '../types';
import { Icons } from '../constants';
import ScoreGauge from './ScoreGauge';
import ZoneDistributionChart from './ZoneDistributionChart';
import GeminiCard from './GeminiCard';
import { getScoreValue, getReliabilityTier } from '../utils';
import { generateComparisonCSV, downloadFile } from '../export';
import { useStreamAI } from '../hooks/useStreamAI';
import { GeminiSkeleton } from './SkeletonCard';

export interface ComparisonData {
  id: string;
  label: string;
  timestamp: string;
  config: {
    region: string;
    machineType: string;
    size: number;
    project: string;
    targetShape: string;
    workloadProfile?: string;
    growthScenario?: string;
  };
  result: CapacityAdvisorResponse;
}

interface ComparisonViewProps {
  items: ComparisonData[];
  onClose: () => void;
}

const OPTION_THEMES = [
  { 
    headerBg: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
  },
  { 
    headerBg: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    textColor: 'text-violet-700 dark:text-violet-300',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
  },
  { 
    headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
  },
  { 
    headerBg: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  }
];

const ComparisonView: React.FC<ComparisonViewProps> = ({ items, onClose }) => {
  const { output, metadata, isStreaming, triggerComparison } = useStreamAI();

  useEffect(() => {
      if (items.length > 0) {
          triggerComparison(items);
      }
  }, [items, triggerComparison]);

  // Safely extract scores, defaulting to 0 if no recommendations exist
  const getTopScore = (result: CapacityAdvisorResponse) => {
      if (!result.recommendations || result.recommendations.length === 0) return 0;
      return getScoreValue(result.recommendations[0], 'obtainability');
  };

  const getTopUptime = (result: CapacityAdvisorResponse) => {
      if (!result.recommendations || result.recommendations.length === 0) return 0;
      return getScoreValue(result.recommendations[0], 'uptime');
  };

  const gridCols = items.length === 3 ? 'grid-cols-4' : 'grid-cols-3';

  const handleExport = () => {
      const csvContent = generateComparisonCSV(items);
      downloadFile(csvContent, `comparison-report-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Run Comparison</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Comparing {items.length} analysis runs side-by-side.</p>
        </div>
        <div className="flex items-center gap-3">
            <button
                onClick={handleExport}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-all"
            >
                <Icons.FileText size={16} />
                Export CSV
            </button>
            <button 
                onClick={() => {
                    onClose();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm shadow-indigo-500/20 flex items-center gap-2 transition-all"
            >
                <Icons.Plus size={16} />
                New Configuration
            </button>
            <button 
                onClick={onClose}
                className="px-4 py-2 btn-secondary flex items-center gap-2"
            >
                <Icons.ArrowLeft size={16} />
                Back to Dashboard
            </button>
        </div>
      </div>

      {/* Head-to-Head Comparison Table */}
      <div className="card-panel overflow-hidden">
        <div className={`grid ${gridCols} bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700`}>
            <div className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Metric</div>
            {items.map((item, index) => (
                <div key={item.id} className={`p-4 font-bold ${index === 0 ? 'text-indigo-600 dark:text-indigo-400' : index === 1 ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'} border-l border-slate-200 dark:border-slate-700`}>
                    {item.label}
                </div>
            ))}
        </div>

        {/* Region */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.Globe size={14} className="text-slate-400" /> Region
            </div>
            {items.map(item => (
                <div key={item.id} className="p-4 text-sm font-bold text-slate-900 dark:text-white border-l border-slate-100 dark:border-slate-800">
                    {item.config.region}
                </div>
            ))}
        </div>

        {/* Machine Type */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.Cpu size={14} className="text-slate-400" /> Machine Type
            </div>
            {items.map(item => (
                <div key={item.id} className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800">
                    {item.config.machineType}
                </div>
            ))}
        </div>

        {/* Instance Count */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.Layers size={14} className="text-slate-400" /> Instance Count
            </div>
            {items.map(item => (
                <div key={item.id} className="p-4 text-sm font-bold text-slate-900 dark:text-white border-l border-slate-100 dark:border-slate-800">
                    {item.config.size} VMs
                </div>
            ))}
        </div>

        {/* Workload Profile */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.Bolt size={14} className="text-slate-400" /> Workload
            </div>
            {items.map(item => (
                <div key={item.id} className="p-4 text-sm font-bold text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800 uppercase text-xs tracking-wide">
                    {item.config.workloadProfile || 'N/A'}
                </div>
            ))}
        </div>

        {/* Growth Scenario */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.BarChart2 size={14} className="text-slate-400" /> Growth
            </div>
            {items.map(item => (
                <div key={item.id} className="p-4 text-sm font-bold text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-800 uppercase text-xs tracking-wide">
                    {item.config.growthScenario || 'N/A'}
                </div>
            ))}
        </div>

        {/* Obtainability Score */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.BarChart2 size={14} className="text-slate-400" /> Obtainability Score
            </div>
            {items.map(item => {
                const score = getTopScore(item.result);
                const percentage = Math.round(score * 100);
                let colorClass = 'bg-emerald-500';
                let textClass = 'text-emerald-600 dark:text-emerald-400';
                let label = 'Optimal';
                
                if (score < 0.4) {
                    colorClass = 'bg-red-500';
                    textClass = 'text-red-600 dark:text-red-400';
                    label = 'Critical';
                } else if (score < 0.7) {
                    colorClass = 'bg-amber-500';
                    textClass = 'text-amber-600 dark:text-amber-400';
                    label = 'Constrained';
                } else if (score < 0.85) {
                    colorClass = 'bg-indigo-500';
                    textClass = 'text-indigo-600 dark:text-indigo-400';
                    label = 'Good';
                }

                return (
                    <div key={item.id} className="p-4 border-l border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-lg font-black text-slate-900 dark:text-white">
                                {percentage}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${textClass}`}>
                                {label}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${colorClass}`} 
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Reliability Tier */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.CheckCircle size={14} className="text-slate-400" /> Reliability Tier
            </div>
            {items.map(item => {
                const tier = getReliabilityTier(getTopUptime(item.result));
                return (
                    <div key={item.id} className="p-4 border-l border-slate-100 dark:border-slate-800">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${tier.color}`}>
                            {tier.label}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">{tier.description}</p>
                    </div>
                );
            })}
        </div>

        {/* Uptime Score */}
        <div className={`grid ${gridCols} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.BarChart2 size={14} className="text-slate-400" /> Uptime Score
            </div>
            {items.map(item => {
                return (
                    <div key={item.id} className="p-4 border-l border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                        <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                            {getTopUptime(item.result)}%
                        </span>
                    </div>
                );
            })}
        </div>

        {/* Provisioning Command */}
        <div className={`grid ${gridCols} hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors`}>
            <div className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icons.Terminal size={14} className="text-slate-400" /> Provisioning Command
            </div>
            {items.map(item => (
                <div key={item.id} className="p-4 border-l border-slate-100 dark:border-slate-800">
                    <code className="text-[10px] font-mono text-slate-600 dark:text-slate-400 block bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 break-all">
                        gcloud compute instances create {item.config.machineType}-demo --project={item.config.project} --zone={item.config.region}-a --machine-type={item.config.machineType}
                    </code>
                </div>
            ))}
        </div>
      </div>

      {/* Aggregated Visualizations */}
      <div className="flex flex-col gap-8">
          {/* Success Probability Comparison */}
          <div className="card-panel p-6 overflow-visible">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                      <Icons.BarChart2 size={16} /> Success Probability Comparison
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      Obtainability Score Analysis
                  </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item, index) => {
                      const theme = OPTION_THEMES[index % OPTION_THEMES.length];
                      return (
                          <div key={item.id} className={`flex flex-col rounded-2xl border ${theme.borderColor} bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md`}>
                              <div className={`px-4 py-3 border-b ${theme.borderColor} ${theme.headerBg} flex justify-between items-center rounded-t-2xl`}>
                                  <span className={`text-xs font-bold uppercase tracking-wider ${theme.textColor}`}>
                                      Option {index + 1}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={`${item.config.region} - ${item.config.machineType}`}>
                                      {item.config.region} - {item.config.machineType}
                                  </span>
                              </div>
                              <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950/50 rounded-b-2xl">
                                  <div className="w-[180px] h-[220px] flex items-center justify-center">
                                      <ScoreGauge 
                                          score={getTopScore(item.result)} 
                                          label={item.label}
                                          description={`${item.config.machineType} (${item.config.size})`}
                                      />
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Zone Distribution Comparison */}
          <div className="card-panel p-6 overflow-visible">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                      <Icons.PieChart size={16} /> Zone Availability Distribution
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      Capacity Distribution by Zone
                  </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item, index) => {
                      const theme = OPTION_THEMES[index % OPTION_THEMES.length];
                      return (
                          <div key={item.id} className={`flex flex-col rounded-2xl border ${theme.borderColor} overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md`}>
                              <div className={`px-4 py-3 border-b ${theme.borderColor} ${theme.headerBg} flex justify-between items-center`}>
                                  <span className={`text-xs font-bold uppercase tracking-wider ${theme.textColor}`}>
                                      Option {index + 1}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={`${item.config.region} - ${item.config.machineType} (${item.config.size})`}>
                                      {item.config.region} - {item.config.machineType}
                                  </span>
                              </div>
                              <div className="p-1 h-[250px] bg-white dark:bg-slate-900">
                                  <ZoneDistributionChart recommendations={item.result.recommendations} />
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* AI Comparison Analysis */}
      <div className="h-[600px]">
         <React.Suspense fallback={<GeminiSkeleton />}>
             <GeminiCard data={metadata} loading={isStreaming} />
         </React.Suspense>
      </div>
    </div>
  );
};

export default ComparisonView;
