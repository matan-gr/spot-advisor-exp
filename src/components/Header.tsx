
import React from 'react';
import { Icons } from '../constants';
import { AppState } from '../types';
import { motion } from 'framer-motion';

interface HeaderProps {
  mockMode: boolean;
  darkMode: boolean;
  onUpdate: (updates: Partial<AppState>) => void;
  onOpenGuide: () => void;
  onOpenPalette: () => void;
}

const Header: React.FC<HeaderProps> = ({ mockMode, darkMode, onUpdate, onOpenGuide, onOpenPalette }) => {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4 select-none group cursor-pointer" onClick={() => window.location.reload()}>
          <motion.div 
            initial={{ rotate: -180, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 1.2, bounce: 0.5 }}
            className="relative w-10 h-10 flex items-center justify-center"
          >
             {/* Sophisticated Logo Construction */}
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all duration-300"></div>
             
             {/* Inner Detail */}
             <div className="absolute inset-[2px] bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-indigo-500/20 rounded-full blur-md"></div>
             </div>

             {/* Icon Layer */}
             <div className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                <Icons.Cloud size={20} strokeWidth={2.5} className="text-indigo-600 dark:text-indigo-400" />
             </div>
             
             {/* Floating Indicator */}
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse"></div>
          </motion.div>
          
          <div className="flex flex-col justify-center">
             <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none font-display flex items-center gap-0.5">
               SPOT<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">ADVISOR</span>
               <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-[9px] font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase tracking-wider font-mono">Experiment</span>
             </h1>
             <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display">Capacity Intelligence</span>
             </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
           {/* Command Palette Trigger */}
           <button 
              onClick={onOpenPalette}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 transition-all mr-2 group"
           >
              <Icons.Search size={14} className="group-hover:text-indigo-500 transition-colors" />
              <span>Search...</span>
              <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <span className="text-xs">⌘</span>K
              </kbd>
           </button>

           {/* Documentation Link */}
           <a 
              href="https://cloud.google.com/compute/docs/instances/spot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors"
           >
              <Icons.Book size={14} />
              <span>Docs</span>
           </a>

           {/* Guide Button */}
           <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={onOpenGuide}
              className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow"
              title="Optimization Guide"
           >
              <Icons.Info size={18} strokeWidth={2} />
           </motion.button>

           {/* Theme Toggle */}
           <motion.button 
              whileTap={{ scale: 0.95, rotate: 15 }}
              onClick={() => onUpdate({ darkMode: !darkMode })}
              className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
           >
              {darkMode ? <Icons.Sun size={18} strokeWidth={2} /> : <Icons.Moon size={18} strokeWidth={2} />}
           </motion.button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
