
import React from 'react';
import { MachineTypeOption } from '../config';
import { Icons } from '../constants';

interface MachineTypeInfoProps {
  details: MachineTypeOption | undefined;
}

const MachineTypeInfo: React.FC<MachineTypeInfoProps> = ({ details }) => {
  if (!details) return null;

  const isGPU = details.family.includes('GPU') || details.family.includes('Accelerator');

  return (
    <div className="glass-panel rounded-xl p-4 mt-2 space-y-3 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Spec Detail</span>
        {isGPU && (
          <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 uppercase shadow-[0_0_10px_rgba(99,102,241,0.3)]">
            High Performance
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
             <Icons.Server />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">vCPUs</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-200">{details.cores} Cores</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-slate-100 dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400">
             <Icons.Layers />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Memory</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-200">{details.memory}</p>
          </div>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-200 dark:border-white/5">
        <p className="text-[10px] font-bold text-slate-400">
          <span className="text-slate-500">Family:</span> {details.family}
        </p>
      </div>
    </div>
  );
};

export default MachineTypeInfo;
