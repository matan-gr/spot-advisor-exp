
import React, { useState, useEffect } from 'react';
import { GroundingMetadata } from '../types';
import { Icons } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface GeminiCardProps {
  data: GroundingMetadata | null;
  loading: boolean;
}

const LoadingStateDisplay = () => {
  const [stepIndex, setStepIndex] = useState(0);
  
  const steps = [
    { text: "Consulting Knowledge Base...", Icon: Icons.Server },
    { text: "Checking Global Events...", Icon: Icons.Globe },
    { text: "Analyzing Preemption Risks...", Icon: Icons.Layers },
    { text: "Formulating Trusted Advice...", Icon: Icons.Chip }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  const CurrentIcon = steps[stepIndex].Icon;

  return (
    <div className="h-full card-panel p-8 flex flex-col justify-center animate-enter relative overflow-hidden min-h-[600px] bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-30 dark:opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent animate-spin-slow"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10 z-10 relative">
                    <motion.div
                        key={stepIndex}
                        initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 1.1, opacity: 0, rotate: 10 }}
                        transition={{ duration: 0.4 }}
                        className="absolute"
                    >
                        <CurrentIcon size={32} />
                    </motion.div>
                </div>
            </div>
            <div className="space-y-3 w-full max-w-xs mx-auto">
                <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-[0.2em] font-display">
                    AI Analysis in Progress
                </h4>
                <div className="h-8 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={stepIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="text-base font-medium text-slate-700 dark:text-slate-200 absolute inset-x-0"
                        >
                            {steps[stepIndex].text}
                        </motion.p>
                    </AnimatePresence>
                </div>
                <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-4">
                    <motion.div 
                        className="h-full bg-indigo-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4.8, ease: "linear", repeat: Infinity }}
                    />
                </div>
            </div>
        </div>
    </div>
  );
};

const GeminiCard = React.memo(({ data, loading }: GeminiCardProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) return <LoadingStateDisplay />;

  if (!data) {
    return (
      <div className="h-full bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 flex flex-col justify-center items-center text-center opacity-60 min-h-[600px]">
         <div className="text-slate-300 dark:text-slate-600 mb-3"><Icons.Cloud /></div>
         <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI Capacity Advisor</p>
         <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 max-w-[240px]">Strategic insights and recommendations will appear here following the capacity analysis.</p>
      </div>
    );
  }

  return (
    <div className="h-full card-panel flex flex-col overflow-hidden animate-enter border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-black/50 bg-white dark:bg-slate-900">
       <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <Icons.Sparkles size={24} />
             </div>
             <div>
                <h3 className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-0.5">Gemini Powered</h3>
                <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Capacity <span className="text-slate-500 dark:text-slate-400 font-medium">Advisor</span>
                </p>
             </div>
          </div>
          
          {/* Search Input */}
          <div className="relative group">
             <input 
                type="text" 
                placeholder="Filter insights..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200 shadow-sm group-hover:shadow-md"
             />
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                <Icons.Search size={14} />
             </div>
          </div>
       </div>
       
       <div className="p-8 flex-grow overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="prose prose-sm dark:prose-invert max-w-none
                    prose-headings:font-display
                    prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white
                    prose-h1:text-lg prose-h1:uppercase prose-h1:tracking-widest prose-h1:border-b prose-h1:border-slate-200 dark:prose-h1:border-slate-700 prose-h1:pb-2 prose-h1:mb-4
                    prose-h2:text-sm prose-h2:uppercase prose-h2:text-indigo-600 dark:prose-h2:text-indigo-400 prose-h2:mt-6 prose-h2:mb-3
                    prose-h3:text-xs prose-h3:uppercase prose-h3:text-slate-700 dark:prose-h3:text-slate-300 prose-h3:mt-4 prose-h3:mb-2
                    prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                    prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
                    prose-ul:list-disc prose-ul:pl-4 prose-ul:space-y-1
                    prose-ol:list-decimal prose-ol:pl-4 prose-ol:space-y-1
                    prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:text-sm
                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:pr-2 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-300
                    prose-table:w-full prose-table:text-xs prose-table:text-left prose-table:border-collapse prose-table:my-6 prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-slate-200 dark:prose-table:border-slate-700
                    prose-th:px-4 prose-th:py-3 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-bold prose-th:uppercase prose-th:text-slate-700 dark:prose-th:text-slate-300 prose-th:border-b prose-th:border-slate-200 dark:prose-th:border-slate-700
                    prose-td:px-4 prose-td:py-3 prose-td:border-b prose-td:border-slate-100 dark:prose-td:border-slate-800 prose-td:text-slate-600 dark:prose-td:text-slate-300
                    prose-code:font-mono prose-code:text-[11px] prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-indigo-600 dark:prose-code:text-indigo-300 prose-code:before:content-none prose-code:after:content-none
                ">
                <ReactMarkdown
                    components={{
                        // Custom renderer for blockquotes to handle alerts/warnings
                        blockquote: ({node, children, ...props}) => {
                            // We can't easily inspect children text here without rendering, 
                            // but we can just apply a generic nice style or try to use the class logic if we could access text.
                            // For now, the prose-blockquote class above handles the base style.
                            return <blockquote {...props}>{children}</blockquote>;
                        }
                    }}
                >
                    {data.insight}
                </ReactMarkdown>
            </div>
          </div>
       </div>


       {data.sources?.length > 0 && (
          <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 items-center overflow-x-auto custom-scrollbar shrink-0">
             <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 shrink-0">
                <Icons.Link size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sources</span>
             </div>
             <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
             {data.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-slate-200 dark:border-slate-700 whitespace-nowrap group">
                   <span className="truncate max-w-[150px] font-medium">{s.title}</span>
                   <Icons.ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
             ))}
          </div>
       )}
    </div>
  );
});

export default GeminiCard;
