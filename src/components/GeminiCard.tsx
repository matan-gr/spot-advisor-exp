
import React, { useState, useEffect } from 'react';
import { GroundingMetadata } from '../types';
import { Icons } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="h-full card-panel p-8 flex flex-col justify-center animate-enter relative overflow-hidden min-h-[300px] bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
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
                <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-[0.2em]">
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

const parseInline = (text: string, keyPrefix: string) => {
  if (!text) return [];
  
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="font-bold text-slate-900 dark:text-white drop-shadow-sm">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${keyPrefix}-${i}`} className="font-mono text-[11px] bg-slate-100 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-200 border border-slate-200 dark:border-indigo-500/30 mx-0.5 shadow-sm">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={`${keyPrefix}-${i}`} className="italic text-slate-500 dark:text-slate-400">{part.slice(1, -1)}</em>;
    }
    return <span key={`${keyPrefix}-${i}`} className="text-slate-600 dark:text-slate-300">{part}</span>;
  });
};

const renderTable = (lines: string[], keyPrefix: string, searchTerm: string) => {
    if (!lines || lines.length === 0) return null;
    const headerLine = lines[0];
    const headers = headerLine.split('|').map(c => c.trim()).filter(c => c);
    const dataLines = lines.slice(2).filter(l => l.trim().length > 0);

    const filteredDataLines = searchTerm 
        ? dataLines.filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
        : dataLines;

    if (searchTerm && filteredDataLines.length === 0 && !headerLine.toLowerCase().includes(searchTerm.toLowerCase())) {
        return null;
    }

    return (
        <div key={keyPrefix} className="my-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/40 shadow-lg">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                  <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                          {headers.map((h, i) => (
                              <th key={i} className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap text-[10px] text-slate-700 dark:text-indigo-300">
                                  {parseInline(h, `th-${i}`)}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
                      {filteredDataLines.map((line, rIdx) => {
                          const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
                          return (
                            <tr key={rIdx} className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors group">
                                {cells.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-4 py-3 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors whitespace-nowrap font-medium">
                                        {parseInline(cell, `td-${rIdx}-${cIdx}`)}
                                    </td>
                                ))}
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
            </div>
        </div>
    );
};

const GeminiCard = React.memo(({ data, loading }: GeminiCardProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) return <LoadingStateDisplay />;

  if (!data) {
    return (
      <div className="h-full bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 flex flex-col justify-center items-center text-center opacity-60 min-h-[300px]">
         <div className="text-slate-300 dark:text-slate-600 mb-3"><Icons.Cloud /></div>
         <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI Capacity Advisor</p>
         <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 max-w-[240px]">Strategic insights and recommendations will appear here following the capacity analysis.</p>
      </div>
    );
  }

  const renderContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let tableBuffer: string[] = [];
    let inTable = false;
    let listBuffer: React.ReactNode[] = [];
    let inList = false;

    const flushList = (idx: number) => {
        if (listBuffer.length > 0) {
            elements.push(
                <div key={`list-group-${idx}`} className="mb-4 space-y-2 pl-1">
                    {listBuffer}
                </div>
            );
            listBuffer = [];
        }
    };

    const lowerSearch = searchTerm.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // --- Table Handling ---
        if (line.startsWith('|')) {
            if (inList) { inList = false; flushList(i); }
            inTable = true;
            tableBuffer.push(line);
            continue;
        }
        if (inTable) {
            inTable = false;
            elements.push(renderTable(tableBuffer, `table-${i}`, searchTerm));
            tableBuffer = [];
        }

        if (!line) {
            if (inList) { inList = false; flushList(i); }
            continue;
        }

        // --- Header Handling ---
        if (line.startsWith('#')) {
            if (inList) { inList = false; flushList(i); }
            
            const level = line.match(/^#+/)?.[0].length || 0;
            const content = line.replace(/^#+\s*/, '').trim();
            
            if (level === 1) {
                elements.push(
                    <div key={`h1-${i}`} className="flex items-center gap-3 mt-8 mb-6 pb-3 border-b border-slate-200 dark:border-slate-700/50">
                        <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"><Icons.Chip size={18} /></div>
                        <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none shadow-black drop-shadow-md">
                            {content}
                        </h1>
                    </div>
                );
            } else if (level === 2) {
                elements.push(
                    <div key={`h2-${i}`} className="flex items-center gap-2 mt-6 mb-4">
                        <span className="text-indigo-600 dark:text-indigo-400"><Icons.ChevronRight size={14} /></span>
                        <h2 className="text-sm font-bold uppercase text-indigo-700 dark:text-indigo-200 tracking-wider">
                            {content}
                        </h2>
                    </div>
                );
            } else {
                elements.push(
                    <div key={`h3-${i}`} className="flex items-center gap-2 mt-4 mb-2">
                        <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-400"></div>
                        <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wide">
                            {content}
                        </h3>
                    </div>
                );
            }
            continue;
        }

        // --- Blockquote Handling ---
        if (line.startsWith('>')) {
            if (inList) { inList = false; flushList(i); }
            const content = line.replace(/^>\s?/, '').trim();
            
            if (searchTerm && !content.toLowerCase().includes(lowerSearch)) continue;

            const isWarning = content.toLowerCase().includes('warning') || content.toLowerCase().includes('alert') || content.toLowerCase().includes('caution');
            const isProTip = content.toLowerCase().includes('pro tip') || content.toLowerCase().includes('strategy') || content.toLowerCase().includes('recommendation');
            
            let borderClass = "border-l-2 border-slate-300 dark:border-slate-600";
            let bgClass = "bg-slate-50 dark:bg-slate-800/50";
            let textClass = "text-slate-600 dark:text-slate-300";
            let icon = <Icons.Info size={14} className="text-slate-400 dark:text-slate-400" />;
            
            if (isWarning) {
                borderClass = "border-l-2 border-amber-500";
                bgClass = "bg-amber-50 dark:bg-amber-500/10";
                textClass = "text-amber-800 dark:text-amber-100";
                icon = <Icons.Alert size={14} className="text-amber-600 dark:text-amber-400" />;
            } else if (isProTip) {
                borderClass = "border-l-2 border-emerald-500";
                bgClass = "bg-emerald-50 dark:bg-emerald-500/10";
                textClass = "text-emerald-800 dark:text-emerald-100";
                icon = <Icons.Check size={14} className="text-emerald-600 dark:text-emerald-400" />;
            }

            elements.push(
                <div key={`bq-${i}`} className={`${bgClass} ${borderClass} px-4 py-3 rounded-r-lg mb-4 text-xs leading-relaxed ${textClass} shadow-sm flex gap-3`}>
                    <div className="shrink-0 mt-0.5">{icon}</div>
                    <div>{parseInline(content, `bq-${i}`)}</div>
                </div>
            );
            continue;
        }

        // --- List Handling (Unordered & Numbered) ---
        const isUnordered = line.startsWith('* ') || line.startsWith('- ');
        const isNumbered = /^\d+\.\s/.test(line);

        if (isUnordered || isNumbered) {
            inList = true;
            const content = line.replace(/^(\* |-\ |\d+\.\ )/, '').trim();
            
            if (searchTerm && !content.toLowerCase().includes(lowerSearch)) continue;

            listBuffer.push(
                <div key={`li-${i}`} className="flex items-start gap-3 relative group/list">
                   {isUnordered ? (
                       <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0 group-hover/list:scale-125 transition-transform"></div>
                   ) : (
                       <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 min-w-[16px]">{line.match(/^\d+/)?.[0]}.</span>
                   )}
                   <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed group-hover/list:text-slate-900 dark:group-hover/list:text-slate-100 transition-colors">
                      {parseInline(content, `li-${i}`)}
                   </span>
                </div>
            );
            continue;
        }
        
        // --- Checklist Handling ---
        if (line.startsWith('[ ]') || line.startsWith('[x]')) {
             if (inList) { inList = false; flushList(i); }
             const isChecked = line.startsWith('[x]');
             const content = line.substring(3).trim();

             if (searchTerm && !content.toLowerCase().includes(lowerSearch)) continue;

             elements.push(
                 <div key={`chk-${i}`} className={`flex items-start gap-3 mb-2 p-3 rounded-lg border transition-all ${isChecked ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}>
                     <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>
                         {isChecked && <Icons.Check size={10} />}
                     </div>
                     <span className={`text-xs font-medium leading-snug ${isChecked ? 'text-emerald-700 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300'}`}>
                        {parseInline(content, `chk-${i}`)}
                     </span>
                 </div>
             );
             continue;
        }

        // --- Paragraph Handling ---
        if (inList) { inList = false; flushList(i); }
        
        if (searchTerm && !line.toLowerCase().includes(lowerSearch)) continue;

        elements.push(
            <p key={`p-${i}`} className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed tracking-wide">
                {parseInline(line, `p-${i}`)}
            </p>
        );
    }
    
    if (inList) flushList(lines.length);
    if (inTable) elements.push(renderTable(tableBuffer, `table-end`, searchTerm));
    
    return elements;
  };

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
            {renderContent(data.insight)}
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
