import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../constants';

export interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  category?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ commands, isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(lowerQuery) || 
      cmd.category?.toLowerCase().includes(lowerQuery)
    );
  }, [query, commands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Ensure selectedIndex is always within bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length && filteredCommands.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredCommands, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] px-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl card-panel shadow-2xl overflow-hidden relative flex flex-col max-h-[60vh]"
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Icons.Search className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-sm font-medium h-6"
              />
              <div className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">ESC</div>
            </div>

            {/* Command List */}
            <div className="overflow-y-auto custom-scrollbar p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No commands found.
                </div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      index === selectedIndex 
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${
                          index === selectedIndex 
                            ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                      }`}>
                        {cmd.icon}
                      </div>
                      <span className="font-medium">{cmd.label}</span>
                    </div>
                    {cmd.shortcut && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          index === selectedIndex
                            ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-400'
                      }`}>
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-[#0f1014]/50 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[10px] text-slate-400">
                <div className="flex gap-3">
                    <span><strong className="text-slate-500 dark:text-slate-300">↑↓</strong> to navigate</span>
                    <span><strong className="text-slate-500 dark:text-slate-300">↵</strong> to select</span>
                </div>
                <span>Spot Capacity Advisor</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CommandPalette;
