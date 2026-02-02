
import React from 'react';

export const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-full">
      <div className="animate-pulse space-y-5 h-full flex flex-col">
        {/* Header Section */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          </div>
          <div className="w-16 h-6 rounded bg-slate-200 dark:bg-slate-800"></div>
        </div>
        
        {/* Body Section */}
        <div className="space-y-3 pt-2 flex-1">
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-4/6"></div>
        </div>

        {/* Footer/Metrics Section */}
        <div className="flex justify-between items-center pt-2 shrink-0">
           <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
           <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const DistributionSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-full">
      <div className="animate-pulse flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        
        {/* Bars */}
        <div className="flex-1 flex items-end gap-4 px-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-2 group">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
                </div>
            ))}
        </div>
        
        {/* X-Axis Labels */}
        <div className="flex justify-between pt-3 px-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-3 w-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
            ))}
        </div>
      </div>
    </div>
  );
};

export const GeminiSkeleton = () => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-full min-h-[300px]">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
            <div className="space-y-2">
                <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-2 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          </div>
          
          {/* Content Lines */}
          <div className="space-y-3">
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-11/12"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
          </div>
  
          {/* Blockquote-ish */}
          <div className="flex gap-4 p-4 border-l-4 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-r-lg">
              <div className="flex-1 space-y-2">
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
              </div>
          </div>

          {/* More Lines */}
          <div className="space-y-3">
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-10/12"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  };
