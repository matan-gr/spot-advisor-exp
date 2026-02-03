import React, { Suspense, useState, useEffect } from 'react';
import { AppState, ScenarioResult, Toast, GeminiDebugEntry } from '../types';
import { Icons } from '../constants';
import { SkeletonCard, DistributionSkeleton, GeminiSkeleton } from './SkeletonCard';
import { getScoreValue } from '../utils';
import { generateCSV, downloadFile } from '../export';

// Lazy Load Heavy Components
const ScoreGauge = React.lazy(() => import('./ScoreGauge'));
const ZoneDistributionChart = React.lazy(() => import('./ZoneDistributionChart'));
const ZoneComparisonChart = React.lazy(() => import('./ZoneComparisonChart'));
const GeminiCard = React.lazy(() => import('./GeminiCard'));
const ComparisonView = React.lazy(() => import('./ComparisonView'));
import { ComparisonData } from './ComparisonView';

import { useStreamAI } from '../hooks/useStreamAI';

// ... (inside BatchResultCard component)
const BatchResultCard = ({ 
    result, 
    isSelected, 
    onSelect, 
    onToggleExpand, 
    isExpanded,
    onUpdateBatchDebug
}: { 
    result: ScenarioResult, 
    isSelected: boolean, 
    onSelect: () => void,
    onToggleExpand: () => void,
    isExpanded: boolean,
    onUpdateBatchDebug?: (scenarioId: string, debug: GeminiDebugEntry) => void
}) => {
    const rawScore = result.response ? getScoreValue(result.response.recommendations?.[0], 'obtainability') : 0;
    const score = rawScore * 100;
    
    // AI Integration for this specific card
    const { output, metadata, isStreaming, trigger, debug } = useStreamAI();
    const hasTriggeredRef = React.useRef(false);

    // Reset trigger ref if status changes (e.g. retry)
    useEffect(() => {
        if (result.status !== 'success') {
            hasTriggeredRef.current = false;
        }
    }, [result.status, result.id]);

    useEffect(() => {
        if (isExpanded && !hasTriggeredRef.current && result.status === 'success' && result.response && !metadata && !isStreaming) {
            hasTriggeredRef.current = true;
            // Construct mock state for AI context
            const mockState = {
                project: result.project,
                region: result.region,
                selectedMachineType: result.machineType,
                size: result.size,
                targetShape: result.targetShape,
                workloadProfile: result.workloadProfile,
                growthScenario: result.growthScenario,
                result: result.response
            } as any;
            
            // Mock machine details (or pass them down if critical, but service handles undefined)
            const mockMachineDetails = {
                id: result.machineType,
                name: result.machineType,
                family: 'Unknown', // Service will fallback
                vCPUs: 0,
                memory: '0 GB'
            } as any;

            trigger(result.id, mockState, mockMachineDetails, result.response);
        }
    }, [isExpanded, result, trigger, metadata, isStreaming]);

    // Sync debug data to parent
    useEffect(() => {
        if (debug && output && onUpdateBatchDebug) {
            onUpdateBatchDebug(result.id, {
                prompt: debug.prompt,
                responseRaw: output,
                model: debug.model,
                timestamp: new Date().toISOString()
            });
        }
    }, [debug, output, result.id, onUpdateBatchDebug]);

    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!result.response) return;
        // Mock state for export function since we don't have full app state here, 
        // but we have enough in result (ScenarioResult extends ScenarioConfig)
        const mockState = {
            project: result.project,
            region: result.region,
            selectedMachineType: result.machineType,
            size: result.size,
            targetShape: result.targetShape
        } as any;
        
        const csvContent = generateCSV(result.response, mockState);
        downloadFile(csvContent, `capacity-report-${result.id.slice(0, 8)}.csv`, 'text/csv');
    };

    return (
        <div className={`border rounded-xl overflow-hidden transition-all group ${
            isSelected 
            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' 
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}>
            <div className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                        onClick={onSelect}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-800'
                        }`}
                    >
                        {isSelected && <Icons.Check size={12} />}
                    </button>
                    
                    <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 md:items-center">
                        <div className="md:col-span-4 flex items-center gap-2">
                            {result.status === 'loading' && <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />}
                            {result.status === 'error' && <Icons.AlertCircle size={14} className="text-red-500 shrink-0" />}
                            {result.status === 'success' && <Icons.CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate font-mono" title={result.machineType}>
                                {result.machineType}
                            </h3>
                        </div>
                        
                        <div className="md:col-span-8 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 min-w-[100px]">
                                <Icons.Globe size={12} className="text-slate-400" /> {result.region}
                            </span>
                            <span className="flex items-center gap-1.5 min-w-[80px]">
                                <Icons.Layers size={12} className="text-slate-400" /> {result.size} VMs
                            </span>
                            <span className="flex items-center gap-1.5 truncate hidden sm:flex">
                                <Icons.Bolt size={12} className="text-slate-400" /> {result.workloadProfile}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-2 border-l border-slate-100 dark:border-slate-800">
                    {result.status === 'success' && (
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Score</div>
                                <div className={`text-sm font-black ${score > 70 ? 'text-emerald-500' : score > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {score.toFixed(0)}%
                                </div>
                            </div>
                            <button
                                onClick={handleExport}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all"
                                title="Export Results"
                            >
                                <Icons.FileText size={14} />
                            </button>
                        </div>
                    )}
                    
                    <button 
                        onClick={onToggleExpand}
                        className={`p-1.5 rounded-md transition-colors ${
                            isExpanded 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600'
                        }`}
                    >
                        {isExpanded ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {isExpanded && result.response && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/30">
                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="h-[350px]">
                            <Suspense fallback={<div className="h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />}>
                                <ScoreGauge 
                                    score={rawScore} 
                                    label="Success Probability" 
                                    description={`${result.machineType} (${result.size} VMs)`} 
                                />
                            </Suspense>
                        </div>
                        <div className="h-[350px]">
                             <Suspense fallback={<div className="h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />}>
                                <ZoneDistributionChart recommendations={result.response.recommendations} />
                            </Suspense>
                        </div>
                         <div className="xl:col-span-2">
                            <Suspense fallback={<SkeletonCard />}>
                                <ZoneComparisonChart recommendations={result.response.recommendations} projectId={result.project} />
                            </Suspense>
                        </div>
                        {/* AI Insights Section */}
                        <div className="xl:col-span-2 h-[800px]">
                            <Suspense fallback={<GeminiSkeleton />}>
                                <GeminiCard data={metadata} loading={isStreaming} />
                            </Suspense>
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};

interface ResultsDashboardProps {
  state: AppState;
  onExport: (type: 'csv' | 'html' | 'pdf' | 'json') => void;
  onClear: () => void;
  onToggleComparison: () => void;
  onSelectRun: (id: string) => void;
  onDeleteRun: (id: string) => void;
  onSetBaseline: (id: string | null) => void;
  addToast: (type: Toast['type'], title: string, message: string, duration?: number) => void;
  onUpdateBatchDebug?: (scenarioId: string, debug: GeminiDebugEntry) => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ 
  state, 
  onExport, 
  onClear, 
  onToggleComparison,
  onSelectRun,
  onDeleteRun,
  onSetBaseline,
  addToast,
  onUpdateBatchDebug
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Local selection state for batch comparison
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const handleBatchSelect = (id: string) => {
      setSelectedBatchIds(prev => {
          if (prev.includes(id)) return prev.filter(i => i !== id);
          if (prev.length >= 3) {
              addToast('warning', 'Comparison Limit Reached', 'You can compare up to 3 runs at a time. Please deselect a run to add another.');
              return prev;
          }
          return [...prev, id];
      });
  };

  // Comparison Mode Logic for Batch
  if (state.comparisonMode && selectedBatchIds.length >= 2) {
      const comparisonItems = selectedBatchIds.map(id => {
          const res = state.batchResults.find(r => r.id === id);
          if (!res || !res.response) return null;
          return {
              id: res.id,
              label: res.name,
              timestamp: new Date().toISOString(),
              config: { 
                  region: res.region,
                  machineType: res.machineType,
                  size: res.size,
                  project: res.project,
                  targetShape: res.targetShape.toString(),
                  workloadProfile: res.workloadProfile,
                  growthScenario: res.growthScenario
              },
              result: res.response
          } as ComparisonData;
      }).filter((item): item is ComparisonData => item !== null);

      if (comparisonItems.length >= 2) {
          return (
              <Suspense fallback={<div>Loading Comparison...</div>}>
                  <ComparisonView items={comparisonItems} onClose={onToggleComparison} />
              </Suspense>
          );
      }
  }

  // Empty State
  if (state.batchResults.length === 0 && !state.loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl animate-enter bg-slate-50/50 dark:bg-slate-900/50">
             <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                <Icons.Layers size={24} className="text-slate-300 dark:text-slate-600" />
             </div>
             <p className="font-bold text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wide">No Analysis Results</p>
             <p className="text-xs mt-1.5 text-slate-400 max-w-xs text-center leading-relaxed">
                Add configurations to the batch queue and run an analysis to generate insights.
             </p>
        </div>
      );
  }

  const handleSelectAll = () => {
      // If all are selected (or max possible are selected), deselect all
      const allIds = state.batchResults.map(r => r.id);
      const maxSelectable = Math.min(allIds.length, 3);
      
      if (selectedBatchIds.length >= maxSelectable) {
          setSelectedBatchIds([]);
      } else {
          // Select up to 3
          if (allIds.length > 3) {
              setSelectedBatchIds(allIds.slice(0, 3));
              addToast('warning', 'Selection Limited', 'Only the first 3 items were selected due to comparison limit.');
          } else {
              setSelectedBatchIds(allIds);
          }
      }
  };

  return (
    <div className="animate-enter space-y-6">
       <div className="flex justify-between items-end">
           <div>
               <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Batch Analysis Results</h2>
               <div className="flex items-center gap-3 mt-1">
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                       {state.batchResults.length} scenarios processed
                   </p>
                   {state.batchResults.length > 0 && (
                       <button 
                           onClick={handleSelectAll}
                           className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline"
                       >
                           {selectedBatchIds.length === state.batchResults.length ? 'Deselect All' : 'Select All'}
                       </button>
                   )}
               </div>
           </div>
           <div className="flex gap-3">
               {selectedBatchIds.length >= 2 && (
                   <button
                       onClick={onToggleComparison}
                       className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm transition-all animate-enter"
                   >
                       Compare Selected ({selectedBatchIds.length})
                   </button>
               )}
               <button 
                   onClick={onClear} 
                   className="px-4 py-2 btn-secondary rounded-lg text-[10px] font-bold uppercase text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all flex items-center gap-2 shadow-sm"
               >
                   <Icons.Trash size={14} />
                   Clear Batch
               </button>
           </div>
       </div>

       <div className="space-y-4">
           {state.batchResults.map(result => (
               <BatchResultCard 
                   key={result.id} 
                   result={result} 
                   isSelected={selectedBatchIds.includes(result.id)}
                   onSelect={() => handleBatchSelect(result.id)}
                   isExpanded={expandedId === result.id}
                   onToggleExpand={() => setExpandedId(expandedId === result.id ? null : result.id)}
                   onUpdateBatchDebug={onUpdateBatchDebug}
               />
           ))}
       </div>
    </div>
  );
};

export default ResultsDashboard;
