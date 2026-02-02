
import React, { useEffect, useState, useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { Icons } from '../constants';

interface ScoreGaugeProps {
  score: number;
  label: string;
  description: string;
  delay?: number;
}

const ScoreGauge = React.memo(({ score, label, description, delay = 0 }: ScoreGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 600 + delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const percentage = Math.round(score * 100);
  
  const tier = useMemo(() => {
      if (score < 0.4) {
      return {
        label: 'Critical Scarcity',
        id: 'critical',
        colors: ['#ef4444', '#b91c1c'], // Red
        bg: 'bg-red-500/10',
        text: 'text-red-500',
        borderColor: 'border-red-500/20',
        desc: 'High contention. Preemption likely.',
        risk: 'High Risk',
        icon: <Icons.Cancel />,
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]'
      };
    } else if (score < 0.7) {
      return {
        label: 'Constrained',
        id: 'constrained',
        colors: ['#f59e0b', '#b45309'], // Amber
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        borderColor: 'border-amber-500/20',
        desc: 'Fluctuating capacity.',
        risk: 'Medium Risk',
        icon: <Icons.Alert />,
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
      };
    } else if (score < 0.85) {
       return {
        label: 'Good Availability',
        id: 'good',
        colors: ['#3b82f6', '#1d4ed8'], // Blue
        bg: 'bg-blue-500/10',
        text: 'text-blue-500',
        borderColor: 'border-blue-500/20',
        desc: 'Stable pool conditions.',
        risk: 'Low Risk',
        icon: <Icons.Check />,
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]'
      };
    }
    return {
      label: 'High Availability',
      id: 'excellent',
      colors: ['#10b981', '#047857'], // Emerald
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      borderColor: 'border-emerald-500/20',
      desc: 'Optimal candidate.',
      risk: 'Optimal',
      icon: <Icons.Check />,
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]'
    };
  }, [score]);

  const size = 140;
  const strokeWidth = 12; 
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const counterVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.5, delay: 0.6 }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.001, duration: 0.5 }}
      className={`h-full card-panel border ${tier.borderColor} ${tier.glow} flex flex-col relative overflow-visible transition-all duration-300 hover:scale-[1.02] group`}
    >
        <div className="flex-1 flex flex-col items-center justify-center p-5 relative z-10">
            <div className={`mb-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current ${tier.bg} ${tier.text} flex items-center gap-1.5 shadow-sm`}>
                {tier.icon}
                {tier.risk}
            </div>

            <div className="relative mb-4" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90 relative z-10">
                    <defs>
                        <linearGradient id={`gradient-${tier.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={tier.colors[0]} stopOpacity="1" />
                            <stop offset="100%" stopColor={tier.colors[1]} stopOpacity="1" />
                        </linearGradient>
                    </defs>
                    {/* Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-slate-100 dark:text-slate-700"
                    />
                    {/* Progress */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={`url(#gradient-${tier.id})`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeLinecap="round"
                        fill="transparent"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - (animatedScore * circumference) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                    <motion.div 
                        variants={counterVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center justify-center text-center w-full"
                    >
                        <div className="flex items-baseline justify-center relative left-1">
                            <span className="text-5xl font-black text-slate-800 dark:text-slate-100 tabular-nums tracking-tighter drop-shadow-sm">
                                <Counter value={percentage} />
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-0.5">%</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="text-center px-2 relative z-10 w-full">
                <h3 className={`text-base font-bold ${tier.text} mb-1.5 transition-colors`}>{tier.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%] mx-auto font-medium">
                    {description}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 max-w-[160px] mx-auto leading-tight">
                    Calculated based on historical spot preemption rates and current capacity pool depth.
                </p>
            </div>
        </div>
    </motion.div>
  );
});

const Counter = ({ value }: { value: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const duration = 1500;
        const startTime = performance.now();
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(value * ease));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <>{count}</>;
};

export default ScoreGauge;
