import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../constants';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Icons.Info size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Optimization Guide</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Best practices for Spot VM capacity planning</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <Icons.Cancel size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Section 0: Usage Instructions */}
            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Icons.Play size={16} /> Usage Instructions
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400">
                        <Icons.Zap size={16} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Single Mode</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc list-inside marker:text-indigo-500">
                    <li>Select <strong>Project ID</strong>, <strong>Region</strong>, and <strong>Machine Type</strong>.</li>
                    <li>Click <strong>"Add to Queue"</strong> to stage the configuration.</li>
                    <li>If the queue has only 1 item, click <strong>"Run Batch (1)"</strong> to analyze immediately.</li>
                    <li>Best for quick, ad-hoc checks of specific instance types.</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded text-violet-600 dark:text-violet-400">
                        <Icons.Layers size={16} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Batch Mode</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc list-inside marker:text-violet-500">
                    <li>Add up to <strong>3 different configurations</strong> to the Execution Queue.</li>
                    <li>Mix different regions, machine types, or sizes to compare.</li>
                    <li>Click <strong>"Run Batch (N)"</strong> to analyze all scenarios in parallel.</li>
                    <li>Use the <strong>"Compare Selected"</strong> button in the dashboard to view side-by-side results.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 1: Core Concepts */}
            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Icons.BookOpen size={16} /> Core Concepts
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
                        <Icons.Bolt size={16} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Obtainability Score</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    A real-time probability score (0-100%) indicating how likely you are to successfully provision VMs in a specific zone. Scores above <strong>70%</strong> are recommended for production workloads.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-600 dark:text-emerald-400">
                        <Icons.Refresh size={16} />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Uptime Score</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    An estimate of stability. A higher score means the VMs are less likely to be preempted (interrupted) by Google Cloud shortly after creation.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Configuration Strategies */}
            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                <Icons.Sliders size={16} /> Configuration Strategies
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-4 group">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-200 dark:border-blue-800 group-hover:scale-110 transition-transform">1</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Be Flexible with Machine Types</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Newer generations (e.g., C3, C4) often have lower Spot availability due to high demand. Consider older but powerful generations like <strong>N2, N2D, or E2</strong> for significantly better obtainability scores.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm border border-purple-200 dark:border-purple-800 group-hover:scale-110 transition-transform">2</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Use "Balanced" Target Shape</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Instead of forcing all VMs into a single zone (e.g., "Any Single Zone"), allow the advisor to distribute them across multiple zones. This drastically reduces the risk of stockouts for large requests.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-sm border border-pink-200 dark:border-pink-800 group-hover:scale-110 transition-transform">3</div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Explore Different Regions</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Capacity varies wildly by geography. If <code>us-central1</code> is constrained, try <code>us-east1</code>, <code>us-east4</code>, or <code>us-west1</code>. The tool makes it easy to switch regions and compare.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Provisioning Tips */}
            <section className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-slate-300 p-5 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                    <Icons.Terminal size={16} className="text-indigo-400" />
                    Provisioning Tips
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-2">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        <span>Always use <strong>Managed Instance Groups (MIGs)</strong> or GKE Node Pools. Never rely on standalone instances.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        <span>Enable <strong>Autoscaling</strong>. If a zone becomes unavailable, the autoscaler can attempt to create nodes in other zones.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        <span>Set a <strong>Shutdown Script</strong> to handle the 30-second preemption warning gracefully.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                   <h3 className="text-sm font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                    <Icons.DollarSign size={16} />
                    Cost Optimization
                  </h3>
                  <ul className="space-y-3 text-sm text-indigo-800 dark:text-indigo-200">
                    <li className="flex gap-2">
                        <Icons.CheckCircle size={14} className="mt-0.5 shrink-0" />
                        <span>Spot VMs offer <strong>60-91% discounts</strong> compared to on-demand pricing.</span>
                    </li>
                    <li className="flex gap-2">
                        <Icons.CheckCircle size={14} className="mt-0.5 shrink-0" />
                        <span>Mix <strong>Spot and On-Demand</strong> in the same cluster for critical workloads.</span>
                    </li>
                    <li className="flex gap-2">
                        <Icons.CheckCircle size={14} className="mt-0.5 shrink-0" />
                        <span>Use <strong>T2D/T2A</strong> (Tau) instances for high price-performance ratios if available.</span>
                    </li>
                  </ul>
                </div>
            </section>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuideModal;
