
import React, { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Recommendation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { getScoreValue } from '../utils';
import { Icons } from '../constants';

interface ZoneRowProps {
  rec: Recommendation;
  projectId: string;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  index: number;
  onShowTooltip: (e: React.MouseEvent, text: string) => void;
  onHideTooltip: () => void;
}

interface ScoreIndicatorProps {
  label: string;
  value: number;
  color: string;
  tooltip: string;
  onShowTooltip: (e: React.MouseEvent, text: string) => void;
  onHideTooltip: () => void;
}

const ScoreIndicator = ({ label, value, color, tooltip, onShowTooltip, onHideTooltip }: ScoreIndicatorProps) => (
  <div className="flex flex-col gap-2 w-full">
    <div className="flex justify-between items-center">
      <span 
        className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-help flex items-center gap-1 whitespace-nowrap"
        onMouseEnter={(e) => onShowTooltip(e, tooltip)}
        onMouseLeave={onHideTooltip}
      >
        {label}
      </span>
      <span className={`text-xs font-mono font-bold ${value >= 70 ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
        {value}%
      </span>
    </div>
    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden w-full">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className={`h-full ${color} rounded-full relative`} 
      >
         <div className="absolute inset-0 bg-white/20"></div>
      </motion.div>
    </div>
  </div>
);

const ZoneRow: React.FC<ZoneRowProps> = React.memo(({ rec, projectId, isExpanded, onToggle, index, onShowTooltip, onHideTooltip }) => {
  const shards = rec.shards || [];
  if (shards.length === 0) return null;

  const isMultiZone = shards.length > 1;
  const primaryShard = shards[0];
  
  const zoneNames = shards.map(s => (s.zone || s.location || '').split('/').pop()).filter(Boolean);
  
  const optionLabel = shards
    .map(s => {
        const name = (s.zone || s.location || '').split('/').pop();
        const count = s.instanceCount ?? s.count;
        return count ? `${name} (${count})` : name;
    })
    .filter(Boolean)
    .join(', ') || 'unknown';

  const obtainabilityScore = getScoreValue(rec, 'obtainability');
  const uptimeScore = getScoreValue(rec, 'uptime');
  const azAvailabilityScore = getScoreValue(rec, 'azAvailability');
  
  const obtainabilityPct = isNaN(obtainabilityScore) ? 0 : Math.round(obtainabilityScore * 100);
  const uptimePct = isNaN(uptimeScore) ? 0 : Math.round(uptimeScore * 100);
  const azAvailabilityPct = isNaN(azAvailabilityScore) ? 0 : Math.round(azAvailabilityScore * 100);
  
  const totalCount = shards.reduce((acc, s) => acc + (s.instanceCount ?? s.count ?? 0), 0);

  // Risk Logic
  let riskLabel = 'Optimal';
  let riskColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
  let barColor = 'bg-emerald-500';
  let riskIcon = <Icons.CheckCircle size={14} />;

  if (obtainabilityScore < 0.4) {
    riskLabel = 'Critical';
    riskColor = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    barColor = 'bg-red-500';
    riskIcon = <Icons.AlertTriangle size={14} />;
  } else if (obtainabilityScore < 0.7) {
    riskLabel = 'Constrained';
    riskColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    barColor = 'bg-amber-500';
    riskIcon = <Icons.AlertCircle size={14} />;
  } else if (obtainabilityScore < 0.85) {
    riskLabel = 'Good';
    riskColor = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    barColor = 'bg-blue-500';
    riskIcon = <Icons.CheckCircle size={14} />;
  }

  const [randomId] = useState(() => Date.now().toString().slice(-4));
  const [commandType, setCommandType] = useState<'GCE' | 'GKE'>('GCE');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
  }, []);

  const provisioningCommand = useMemo(() => {
    const safeMachineType = (primaryShard.machineType || '').split('/').pop();

    if (commandType === 'GKE') {
        const zones = (rec.shards || []).map(s => (s.location || '').split('/').pop()).filter(Boolean).join(',');
        const nodesPerZone = Math.ceil(totalCount / ((rec.shards || []).length || 1));
        const firstZone = ((rec.shards || [])[0]?.location || '').split('/').pop() || '';
        const region = firstZone.split('-').slice(0, -1).join('-');

        return `# Create a Spot Node Pool with Autoscaling (Best Practice)
gcloud container node-pools create spot-pool-${randomId} \\
  --cluster=YOUR_CLUSTER_NAME \\
  --project=${projectId} \\
  --region=${region} \\
  --machine-type=${safeMachineType} \\
  --spot \\
  --enable-autoscaling \\
  --min-nodes=0 \\
  --max-nodes=${nodesPerZone + 5} \\
  --num-nodes=${nodesPerZone} \\
  --node-locations=${zones} \\
  --node-labels=intent=spot-capacity-check,created-by=spot-advisor \\
  --scopes=cloud-platform`;
    }

    const getNames = (base: string, count: number) => count > 1 ? `${base}-{1..${count}}` : base;

    if (isMultiZone) {
        const commands = (rec.shards || []).map((s, i) => {
            const z = (s.location || '').split('/').pop() || 'unknown';
            const count = s.instanceCount ?? s.count ?? 0;
            if (count === 0) return null;
            
            // Use zone in name to avoid conflicts and improve clarity
            const baseName = `spot-${randomId}-${z}`;
            
            return `gcloud compute instances create ${getNames(baseName, count)} \\
  --zone=${z} \\
  --machine-type=${safeMachineType} \\
  --provisioning-model=SPOT \\
  --instance-termination-action=DELETE \\
  --image-family=debian-11 \\
  --image-project=debian-cloud \\
  --labels=managed-by=spot-advisor \\
  --project=${projectId} &`;
        }).filter(Boolean);
        
        return `# Provision across multiple zones (Bash background jobs)
${commands.join('\n\n')}

wait
echo "All Spot requests submitted."`;
    }

    return `# Provision single-zone Spot VMs
gcloud compute instances create ${getNames(`spot-${randomId}`, totalCount)} \\
  --project=${projectId} \\
  --zone=${zoneNames[0] || 'unknown'} \\
  --machine-type=${safeMachineType} \\
  --provisioning-model=SPOT \\
  --instance-termination-action=DELETE \\
  --image-family=debian-11 \\
  --image-project=debian-cloud \\
  --labels=managed-by=spot-advisor`;
  }, [isMultiZone, rec.shards, randomId, projectId, zoneNames, primaryShard.machineType, totalCount, commandType]);

  return (
    <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group relative rounded-xl border transition-all duration-300 mb-3 overflow-hidden ${
            isExpanded 
            ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-1 ring-indigo-500 shadow-lg z-10' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
        }`}
    >
      {/* Best Badge */}
      {index === 0 && (
          <div className="absolute top-0 right-0 z-20">
              <div className="bg-gradient-to-bl from-indigo-500 to-purple-600 text-white text-[9px] font-bold uppercase py-1 px-3 rounded-bl-xl shadow-sm">
                  Top Recommendation
              </div>
          </div>
      )}

      <div 
        onClick={() => onToggle(index)}
        className="p-5 cursor-pointer"
      >
        <div className="flex flex-col md:flex-row gap-8 items-center">
            
            {/* Left: Icon & Title */}
            <div className="flex items-center gap-5 flex-1 w-full md:w-auto">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-colors ${
                    isExpanded 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'
                }`}>
                    {isMultiZone ? <Icons.Layers size={20} /> : <Icons.Server size={20} />}
                </div>
                
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2.5">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white truncate" title={optionLabel}>
                            {optionLabel}
                        </h4>
                        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${riskColor}`}>
                            {riskIcon} {riskLabel}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-2">
                            <Icons.Chip size={12} />
                            <span className="font-mono">{(primaryShard.machineType || '').split('/').pop()}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        <span className="flex items-center gap-2">
                            {isMultiZone ? <Icons.Globe size={12} /> : <Icons.MapPin size={12} />}
                            <span>{isMultiZone ? 'Multi-Zone' : 'Single Zone'}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Middle: Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full md:w-auto md:min-w-[400px]">
                <ScoreIndicator 
                    label="Obtainability" 
                    value={obtainabilityPct} 
                    color={barColor} 
                    tooltip="Probability of successfully acquiring the requested capacity."
                    onShowTooltip={onShowTooltip}
                    onHideTooltip={onHideTooltip}
                />
                <ScoreIndicator 
                    label="Reliability" 
                    value={uptimePct} 
                    color="bg-indigo-500" 
                    tooltip="Estimated stability score (0-100). Higher is better."
                    onShowTooltip={onShowTooltip}
                    onHideTooltip={onHideTooltip}
                />
            </div>

            {/* Right: Count & Chevron */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                 <div className="text-right">
                     <span className="block text-xl font-black text-slate-900 dark:text-white leading-none">
                        {totalCount}
                     </span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Instances
                     </span>
                 </div>
                 <div className={`transition-transform duration-300 text-slate-400 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`}>
                     <Icons.ChevronDown size={20} />
                 </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
      {isExpanded && (
        <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
        >
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Distribution Visual */}
                    <div>
                        <h5 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-4 flex items-center gap-2">
                             <Icons.PieChart size={14} /> 
                             Zone Distribution
                        </h5>
                        
                        <div className="space-y-3">
                            {shards.map((s, idx) => {
                                const count = s.instanceCount ?? s.count ?? 0;
                                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                                const zoneName = (s.zone || s.location || '').split('/').pop() || 'Unknown';
                                
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-24 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 truncate text-right">
                                            {zoneName}
                                        </div>
                                        <div className="flex-1 h-8 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative flex items-center px-3">
                                            <div 
                                                className="absolute inset-y-0 left-0 bg-indigo-50 dark:bg-indigo-900/20 transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                            <div className="relative z-10 flex justify-between w-full text-xs">
                                                <span className="font-bold text-slate-900 dark:text-white">{count} VMs</span>
                                                <span className="text-slate-400">{percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Command Box */}
                    <div className="flex flex-col h-full">
                         <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                                <Icons.Terminal size={14} />
                                Provisioning Command
                            </h5>
                            <div className="flex bg-white dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                                {['GCE', 'GKE'].map((type) => (
                                    <button 
                                        key={type}
                                        onClick={(e) => { e.stopPropagation(); setCommandType(type as any); }}
                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${commandType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                         </div>
                         
                         <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner relative group/code">
                            <div className="absolute top-3 right-3 z-10">
                                <button 
                                    className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all opacity-0 group-hover/code:opacity-100 shadow-lg border border-slate-700 hover:border-indigo-500"
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleCopy(provisioningCommand);
                                    }}
                                >
                                    {isCopied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                                </button>
                            </div>
                            <div className="p-4 overflow-x-auto custom-scrollbar h-full">
                                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                                    {provisioningCommand}
                                </pre>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
});

interface ZoneComparisonChartProps {
  recommendations: Recommendation[];
  projectId: string;
}

const ZoneComparisonChart: React.FC<ZoneComparisonChartProps> = React.memo(({ recommendations, projectId }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // Default expand first item
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; text: string }>({ show: false, x: 0, y: 0, text: '' });
  
  const handleToggle = useCallback((index: number) => {
      setExpandedIndex(prev => prev === index ? null : index);
  }, []);

  const handleShowTooltip = useCallback((e: React.MouseEvent, text: string) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
          show: true,
          x: rect.left + (rect.width / 2),
          y: rect.top - 10,
          text
      });
  }, []);

  const handleHideTooltip = useCallback(() => {
      setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
          opacity: 1,
          scale: 1,
          transition: { staggerChildren: 0.1 }
      }
  };

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-panel flex flex-col h-full relative overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400">
                <Icons.BarChart2 size={18} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capacity Recommendations</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ranked by spot obtainability score</p>
            </div>
         </div>
         <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
            {recommendations.length} Options
         </span>
      </div>
      
      <motion.div 
        className="flex-grow overflow-y-auto custom-scrollbar p-6 min-h-[300px]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Icons.Search size={24} className="opacity-50" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No placement options found</p>
                <p className="text-xs mt-1">Try adjusting your filters or region selection.</p>
            </div>
        ) : (
            recommendations.map((rec, idx) => (
                <ZoneRow 
                    key={idx}
                    index={idx}
                    rec={rec}
                    projectId={projectId}
                    isExpanded={expandedIndex === idx}
                    onToggle={handleToggle}
                    onShowTooltip={handleShowTooltip}
                    onHideTooltip={handleHideTooltip}
                />
            ))
        )}
      </motion.div>

      {tooltip.show && createPortal(
          <div 
            className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full transition-all duration-200"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
              <div className="bg-slate-900 text-white text-[10px] font-medium px-3 py-1.5 rounded shadow-xl border border-slate-700 whitespace-nowrap mb-2">
                {tooltip.text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-slate-900"></div>
              </div>
          </div>,
          document.body
      )}
    </motion.div>
  );
});

export default ZoneComparisonChart;
