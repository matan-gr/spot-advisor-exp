
import React, { useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { Toast as ToastType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps & { index: number; total: number }> = ({ toast, onClose, index, total }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration || 6000);
  const [isPaused, setIsPaused] = React.useState(false);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, remainingTimeRef.current - elapsed);

    timerRef.current = setTimeout(() => {
      onClose(toast.id);
    }, remaining);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onClose, toast.id, isPaused]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const styles = {
    success: 'bg-white/95 dark:bg-slate-900/95 border-l-4 border-l-emerald-500 border-y border-r border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-sm',
    error: 'bg-white/95 dark:bg-slate-900/95 border-l-4 border-l-red-500 border-y border-r border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-sm',
    warning: 'bg-white/95 dark:bg-slate-900/95 border-l-4 border-l-amber-500 border-y border-r border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-sm',
    info: 'bg-white/95 dark:bg-slate-900/95 border-l-4 border-l-indigo-500 border-y border-r border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-sm'
  };

  const icons = {
    success: <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 ring-1 ring-emerald-500/20"><Icons.Check size={14} strokeWidth={3} /></div>,
    error: <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 ring-1 ring-red-500/20"><Icons.Cancel size={14} strokeWidth={3} /></div>,
    warning: <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 ring-1 ring-amber-500/20"><Icons.Alert size={14} strokeWidth={3} /></div>,
    info: <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 ring-1 ring-indigo-500/20"><Icons.Info size={14} strokeWidth={3} /></div>
  };

  // 0 = Front (Newest), 1 = Middle, 2 = Back
  const isStacked = total > 1;
  const reverseIdx = total - 1 - index;
  
  // Enhanced stacking visuals
  const offset = isStacked ? reverseIdx * 12 : 0; 
  const scale = isStacked ? 1 - reverseIdx * 0.04 : 1;
  const opacity = isStacked ? 1 - reverseIdx * 0.15 : 1;
  const zIndex = isStacked ? 100 - reverseIdx : 1;
  const blur = isStacked && reverseIdx > 0 ? 'blur-[1px]' : '';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ 
        opacity: opacity, 
        y: -offset, 
        scale: scale,
        zIndex: zIndex 
      }}
      exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`w-full p-4 rounded-xl flex gap-3.5 relative cursor-pointer group transition-all ${styles[toast.type]} ${blur}`}
      onClick={() => onClose(toast.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <h4 className="text-sm font-bold mb-1 tracking-tight text-slate-800 dark:text-slate-200">{toast.title}</h4>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed break-words">{toast.message}</p>
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(toast.id); }}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
      >
          <Icons.Cancel size={14} />
      </button>

      {/* Timer Bar - Only active for the front toast */}
      {reverseIdx === 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 rounded-b-xl overflow-hidden">
            <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: isPaused ? '100%' : '0%' }}
                transition={{ duration: isPaused ? 0 : remainingTimeRef.current / 1000, ease: 'linear' }}
                className={`h-full ${
                    toast.type === 'success' ? 'bg-emerald-500' :
                    toast.type === 'error' ? 'bg-red-500' :
                    toast.type === 'warning' ? 'bg-amber-500' :
                    'bg-indigo-500'
                }`}
            />
        </div>
      )}
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  // Group consecutive identical toasts
  const groups: ToastType[][] = [];
  toasts.forEach(toast => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.length > 0) {
      const lastToast = lastGroup[0];
      // Check for identity (title, message, type)
      if (lastToast.title === toast.title && lastToast.message === toast.message && lastToast.type === toast.type) {
        lastGroup.push(toast);
        return;
      }
    }
    groups.push([toast]);
  });

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
      <AnimatePresence mode="popLayout">
        {groups.map((group) => {
           // We only stack if > 1 item.
           // If stacked, we show max 3 items.
           // The last item in the array is the newest.
           const visibleStack = group.slice(-3);
           
           return (
             <div key={group[0].id} className="pointer-events-auto relative isolate">
                {visibleStack.map((toast, index, array) => {
                    const isFront = index === array.length - 1;
                    return (
                        <div key={toast.id} className={isFront ? "relative" : "absolute inset-0"}>
                            <ToastItem 
                                toast={toast} 
                                onClose={removeToast} 
                                index={index} 
                                total={array.length} 
                            />
                        </div>
                    );
                })}
             </div>
           );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
