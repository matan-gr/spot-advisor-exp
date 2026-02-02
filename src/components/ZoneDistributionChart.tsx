import React, { useMemo } from 'react';
import { Recommendation } from '../types';
import { getScoreValue } from '../utils';
import { Icons } from '../constants';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  Label
} from 'recharts';

interface ZoneDistributionChartProps {
  recommendations: Recommendation[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 min-w-[220px] animate-in fade-in zoom-in-95 duration-200 z-[1000]">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                data.riskLabel === 'Critical' ? 'bg-red-500 shadow-red-500/50' :
                data.riskLabel === 'Constrained' ? 'bg-amber-500 shadow-amber-500/50' :
                data.riskLabel === 'Good' ? 'bg-indigo-500 shadow-indigo-500/50' :
                'bg-emerald-500 shadow-emerald-500/50'
            }`}></div>
            <span className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide truncate max-w-[180px]">
                {data.fullLabel || data.name}
            </span>
        </div>
        
        <div className="space-y-3">
            {data.type === 'score' ? (
                <>
                    <div className="flex justify-between items-center group">
                        <span className="text-xs text-slate-500 dark:text-slate-300 font-medium group-hover:text-indigo-500 transition-colors">Obtainability</span>
                        <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-transparent dark:border-slate-600/30">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        data.value < 40 ? 'bg-red-500' :
                                        data.value < 70 ? 'bg-amber-500' :
                                        'bg-indigo-500'
                                    }`} 
                                    style={{ width: `${data.value}%` }}
                                ></div>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white w-8 text-right">{data.value}%</span>
                        </div>
                    </div>
                    {data.uptime !== undefined && (
                        <div className="flex justify-between items-center group">
                            <span className="text-xs text-slate-500 dark:text-slate-300 font-medium group-hover:text-emerald-500 transition-colors">Est. Uptime</span>
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-transparent dark:border-slate-600/30">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${data.uptime}%` }}></div>
                                </div>
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white w-8 text-right">{data.uptime}%</span>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Instance Count</span>
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{data.value} VMs</span>
                    </div>
                    {data.percent !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Share</span>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{(data.percent * 100).toFixed(0)}%</span>
                        </div>
                    )}
                </>
            )}
        </div>
        
        {data.isMulti && (
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md w-fit">
                    <Icons.Layers size={10} /> Multi-Zone Strategy
                </span>
            </div>
        )}
      </div>
    );
  }
  return null;
};

const ZoneDistributionChart: React.FC<ZoneDistributionChartProps> = React.memo(({ recommendations }) => {
  
  const { mode, data, chartLabel, subLabel } = useMemo(() => {
    // Determine if this is a "Breakdown" (Spread) or "Comparison" (Alternatives)
    // Breakdown: 1 recommendation with multiple shards (zones)
    // Comparison: Multiple recommendations (likely single zone each)
    const isBreakdown = recommendations.length === 1 && (recommendations[0].shards || []).length > 1;
    
    if (isBreakdown) {
        const rec = recommendations[0];
        const total = (rec.shards || []).reduce((a, b) => a + (b.instanceCount ?? b.count ?? 0), 0);
        
        return {
            mode: 'breakdown' as const,
            data: (rec.shards || []).map(shard => {
                const rawZone = shard.zone || shard.location || '';
                const zoneName = rawZone.split('/').pop() || 'Unknown';
                
                return {
                    name: zoneName,
                    fullLabel: zoneName, // Use clean name instead of full URL
                    value: shard.instanceCount ?? shard.count ?? 0,
                    percent: (shard.instanceCount ?? shard.count ?? 0) / total,
                    riskLabel: 'Optimal', // Breakdown usually implies we got what we wanted
                    type: 'count'
                };
            }),
            chartLabel: 'Distribution',
            subLabel: 'Zone Breakdown (VMs)'
        };
    } else {
        return {
            mode: 'compare' as const,
            data: recommendations.slice(0, 10).map((rec, idx) => {
                const obtainability = getScoreValue(rec, 'obtainability') * 100;
                const uptime = getScoreValue(rec, 'uptime') * 100;
                const isMulti = (rec.shards || []).length > 1;
                
                let riskLabel = 'Optimal';
                if (obtainability < 40) riskLabel = 'Critical';
                else if (obtainability < 70) riskLabel = 'Constrained';
                else if (obtainability < 85) riskLabel = 'Good';

                const zoneNames = (rec.shards || []).map(s => (s.zone || s.location || '').split('/').pop()).filter(Boolean);
                const displayZones = zoneNames.join(', ');
                // Use the zone name as the label if it's single zone, otherwise "Opt X"
                const name = zoneNames.length === 1 ? zoneNames[0] : `Opt ${idx + 1}`;

                return {
                    name: name,
                    fullLabel: displayZones,
                    value: Math.round(obtainability),
                    uptime: Math.round(uptime),
                    riskLabel,
                    isMulti,
                    type: 'score'
                };
            }),
            chartLabel: 'Analysis',
            subLabel: 'Zone Scores'
        };
    }
  }, [recommendations]);

  return (
    <div className="h-full card-panel flex flex-col relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      {/* Enterprise Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Icons.BarChart2 size={20} />
             </div>
             <div>
                <h3 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-0.5">{chartLabel}</h3>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {subLabel}
                </p>
             </div>
         </div>
         {mode === 'breakdown' && (
             <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-bold uppercase tracking-wider shadow-sm">
                 Active
             </span>
         )}
      </div>

      {/* Chart Canvas */}
      <div className="flex-grow w-full p-4 relative z-0">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, bottom: 20, left: -20 }} barSize={32}>
                <defs>
                    <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="gradConstrained" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="gradGood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="gradOptimal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#cbd5e1' }} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                    dy={10}
                    interval={0}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                    domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} wrapperStyle={{ zIndex: 1000 }} />
                
                {mode === 'compare' && (
                    <>
                        <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5}>
                            <Label value="Constrained" position="insideTopRight" fill="#f59e0b" fontSize={10} fontWeight={700} />
                        </ReferenceLine>
                        <ReferenceLine y={85} stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.5}>
                            <Label value="Good" position="insideTopRight" fill="#6366f1" fontSize={10} fontWeight={700} />
                        </ReferenceLine>
                    </>
                )}
                
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                    {data.map((entry: any, index: number) => {
                        let fill = 'url(#gradOptimal)'; 
                        if (entry.type === 'score') {
                            if (entry.value < 40) fill = 'url(#gradCritical)'; 
                            else if (entry.value < 70) fill = 'url(#gradConstrained)'; 
                            else if (entry.value < 85) fill = 'url(#gradGood)'; 
                        } else {
                            // For count, use a standard blue or cycle colors
                            fill = 'url(#gradCount)';
                        }
                        
                        return (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={fill} 
                                stroke={entry.isMulti ? 'rgba(255,255,255,0.8)' : 'none'} 
                                strokeWidth={entry.isMulti ? 2 : 0} 
                                strokeDasharray={entry.isMulti ? '4 2' : ''} 
                            />
                        );
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default ZoneDistributionChart;
