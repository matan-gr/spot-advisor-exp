import React from 'react';
import { AppState } from '../types';
import { Icons } from '../constants';
import { getScoreValue } from '../utils';

interface HistoryTabProps {
  history: AppState['history'];
  selectedComparisonIds: AppState['selectedComparisonIds'];
  currentResult: AppState['result'];
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
  onToggleComparison: () => void;
  baselineRunId: string | null;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  selectedComparisonIds,
  currentResult,
  onSelectRun,
  onDeleteRun,
  onToggleComparison,
  baselineRunId
}) => {
  const [expandedRuns, setExpandedRuns] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (history.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Icons.History size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No analysis history available yet.</p>
              <p className="text-sm mt-1">Run an analysis to see it here.</p>
          </div>
      );
  }

  return (
      <div className="animate-enter">
           <div className="flex items-center justify-between mb-6">
               <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analysis History</h3>
                   <p className="text-sm text-slate-500">Select runs to compare or review past configurations.</p>
               </div>
               <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-500">Select 2 runs to compare</span>
                   <button 
                       onClick={onToggleComparison}
                       disabled={selectedComparisonIds.length !== 2}
                       className="px-3 py-1.5 btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       Compare Selected ({selectedComparisonIds.length}/2)
                   </button>
               </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {history.map(run => {
                   const isSelected = selectedComparisonIds.includes(run.id);
                   const isExpanded = expandedRuns.has(run.id);
                   const isBaseline = run.id === baselineRunId;
                   const score = getScoreValue(run.result.recommendations[0], 'obtainability');
                   
                   return (
                       <div 
                           key={run.id}
                           className={`card-panel p-4 cursor-pointer transition-all border-2 ${isBaseline ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10' : isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                           onClick={() => onSelectRun(run.id)}
                       >
                           <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center gap-2">
                                   <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected || isBaseline ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                       {(isSelected || isBaseline) && <Icons.Check size={10} className="text-white" />}
                                   </div>
                                   <span className="text-xs font-mono text-slate-400">{new Date(run.timestamp).toLocaleString()}</span>
                                   {isBaseline && <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded">Baseline</span>}
                               </div>
                               <div className="flex items-center gap-1">
                                   <button 
                                       onClick={(e) => toggleExpand(run.id, e)}
                                       className="text-slate-400 hover:text-indigo-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                       title={isExpanded ? "Collapse details" : "Expand details"}
                                   >
                                       {isExpanded ? <Icons.ArrowUp size={14} className="rotate-180" /> : <Icons.ChevronDown size={14} />}
                                   </button>
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); onDeleteRun(run.id); }}
                                       className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                       title="Delete run"
                                   >
                                       <Icons.Trash size={14} />
                                   </button>
                               </div>
                           </div>
                           
                           {/* Compare with Baseline Action */}
                           {baselineRunId && !isBaseline && (
                               <button
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       // If already selected, do nothing or handle toggle logic if needed
                                       // But here we want to force comparison with baseline
                                       onSelectRun(run.id); // Select this one
                                       if (!selectedComparisonIds.includes(baselineRunId)) {
                                            onSelectRun(baselineRunId); // Ensure baseline is selected
                                       }
                                       onToggleComparison();
                                   }}
                                   className="w-full mt-2 mb-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-center gap-1.5"
                               >
                                   <Icons.ArrowLeft size={12} className="rotate-180" />
                                   Compare with Baseline
                               </button>
                           )}

                           {/* Compare with Current Action (Only if no baseline set) */}
                           {currentResult && !isSelected && selectedComparisonIds.length === 0 && !baselineRunId && (
                               <button
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       onSelectRun(run.id);
                                       onToggleComparison();
                                   }}
                                   className="w-full mt-2 mb-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-center gap-1.5"
                               >
                                   <Icons.ArrowLeft size={12} className="rotate-180" />
                                   Compare with Current Result
                               </button>
                           )}
                           
                           <div className="flex items-center gap-2 mb-2">
                               <div className={`w-2 h-2 rounded-full ${score > 70 ? 'bg-emerald-500' : score > 40 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                               <span className="font-bold text-sm">{run.config.region}</span>
                           </div>
                           
                           <div className="text-xs text-slate-500 space-y-1">
                               <p>{run.config.machineType} • Size: {run.config.size}</p>
                               {!isExpanded && <p>{run.result.recommendations.length} options found</p>}
                           </div>

                           {isExpanded && (
                               <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs space-y-2 animate-enter">
                                   <div className="grid grid-cols-2 gap-2">
                                       <span className="text-slate-400">Project</span>
                                       <span className="font-mono text-slate-700 dark:text-slate-300 truncate" title={run.config.project}>{run.config.project}</span>
                                       
                                       <span className="text-slate-400">Region</span>
                                       <span className="font-mono text-slate-700 dark:text-slate-300">{run.config.region}</span>
                                       
                                       <span className="text-slate-400">Machine</span>
                                       <span className="font-mono text-slate-700 dark:text-slate-300">{run.config.machineType}</span>
                                       
                                       <span className="text-slate-400">Size</span>
                                       <span className="font-mono text-slate-700 dark:text-slate-300">{run.config.size}</span>
                                       
                                       <span className="text-slate-400">Shape</span>
                                       <span className="font-mono text-slate-700 dark:text-slate-300">{run.config.targetShape}</span>
                                   </div>
                               </div>
                           )}
                       </div>
                   );
               })}
           </div>
       </div>
  );
};

export default HistoryTab;
