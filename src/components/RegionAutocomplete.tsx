
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../constants';

export interface RegionOption {
  id: string;
  name: string;
  continent: string;
}

interface RegionAutocompleteProps {
  options: RegionOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  isLoading?: boolean;
  error?: boolean;
}

const RegionAutocomplete: React.FC<RegionAutocompleteProps> = ({ options, value, onChange, label, placeholder, isLoading, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isInternalSelection = useRef(false);

  // Update coordinates when opening
  useLayoutEffect(() => {
    if (isOpen && wrapperRef.current) {
        const updateCoords = () => {
            if (wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                setCoords({
                    left: rect.left,
                    top: rect.bottom + window.scrollY + 4,
                    width: rect.width
                });
            }
        };
        updateCoords();
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }
  }, [isOpen]);

  // Debounce the filtering query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Sync internal input state with external value prop
  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected && !isInternalSelection.current) {
      const displayText = `${selected.name} (${selected.id})`;
      setInputValue(displayText);
      setDebouncedQuery(displayText);
    } else if (!value && !isInternalSelection.current) {
       setInputValue('');
       setDebouncedQuery('');
    }
    isInternalSelection.current = false;
  }, [value, options]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
          wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
          listRef.current && !listRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
        const selected = options.find(o => o.id === value);
        if (selected) {
           const displayText = `${selected.name} (${selected.id})`;
           setInputValue(displayText);
           setDebouncedQuery(displayText);
        } else if (!value) {
            setInputValue('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  const filteredOptions = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return options;

    const fuzzyMatch = (text: string, search: string) => {
        let searchIdx = 0, textIdx = 0;
        while (searchIdx < search.length && textIdx < text.length) {
            if (search[searchIdx] === text[textIdx]) {
                searchIdx++;
            }
            textIdx++;
        }
        return searchIdx === search.length;
    };

    return options
      .map(opt => {
        const id = opt.id.toLowerCase();
        const name = opt.name.toLowerCase();
        const continent = opt.continent.toLowerCase();
        const fullName = `${name} (${id})`.toLowerCase();
        
        let score = 0;
        if (id === q || name === q || fullName === q) score = 100;
        else if (fullName.includes(q)) score = 90; // Fix for pre-filled values matching
        else if (id.startsWith(q) || name.startsWith(q)) score = 80;
        else if (continent.startsWith(q)) score = 70;
        else if (id.includes(q) || name.includes(q)) score = 60;
        else if (continent.includes(q)) score = 50;
        else if (fuzzyMatch(id, q)) score = 40;
        
        return { opt, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.opt);
  }, [options, debouncedQuery]);

  // Group options by Family for Display
  const groupedOptions = useMemo(() => {
    const groups: Record<string, RegionOption[]> = {};
    const continentOrder = ['Americas', 'Europe', 'Asia Pacific', 'Middle East', 'Africa'];
    
    // Initialize groups
    continentOrder.forEach(c => groups[c] = []);
    groups['Other'] = [];
    
    filteredOptions.forEach(opt => {
      const cont = opt.continent || 'Other';
      if (!groups[cont]) groups[cont] = [];
      groups[cont].push(opt);
    });
    
    // Convert to entries, filter empty, and sort
    return Object.entries(groups)
        .filter(([_, items]) => items.length > 0)
        .sort((a, b) => {
            const idxA = continentOrder.indexOf(a[0]);
            const idxB = continentOrder.indexOf(b[0]);
            // Handle 'Other' or unknown continents to be at the end
            const posA = idxA === -1 ? 999 : idxA;
            const posB = idxB === -1 ? 999 : idxB;
            return posA - posB;
        });
  }, [filteredOptions]);

  const handleSelect = (option: RegionOption) => {
    isInternalSelection.current = true;
    const displayText = `${option.name} (${option.id})`;
    setInputValue(displayText);
    setDebouncedQuery(displayText);
    onChange(option.id);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue('');
      setDebouncedQuery('');
      onChange('');
      setIsOpen(true);
      inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
            setIsOpen(true);
            e.preventDefault();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        scrollActiveIntoView(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        scrollActiveIntoView(activeIndex - 1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            handleSelect(filteredOptions[activeIndex]);
        }
    } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
    }
  };

  const scrollActiveIntoView = (index: number) => {
      const el = document.getElementById(`region-${index}`);
      if (el) {
          el.scrollIntoView({ block: 'nearest' });
      }
  };

  return (
    <div className="relative group" ref={wrapperRef}>
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 dark:text-[#94a3b8] mb-2 tracking-wider group-focus-within:text-indigo-500 transition-colors">
        {label}
        {isLoading && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
           <Icons.Globe />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-10 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 truncate shadow-sm cursor-text ${
              error 
              ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500 bg-red-50/10' 
              : 'focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500'
          }`}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
           {inputValue && (
             <button 
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                tabIndex={-1}
             >
                <Icons.Cancel />
             </button>
           )}
           <div className="pointer-events-none text-slate-400">
             <Icons.ChevronDown />
           </div>
        </div>
      </div>

      {isOpen && coords.width > 0 && createPortal(
        <div 
            ref={listRef}
            style={{
                position: 'absolute',
                left: coords.left,
                top: coords.top,
                width: coords.width,
                zIndex: 9999
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl max-h-[400px] overflow-y-auto custom-scrollbar animate-enter ring-1 ring-black/5"
        >
          {groupedOptions.length === 0 ? (
            <div className="px-4 py-8 text-center">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">No regions found</p>
                <p className="text-[10px] text-slate-500">Check spelling or try a fuzzy search (e.g. 'usc1')</p>
            </div>
          ) : (
            groupedOptions.map(([continent, items]) => (
                <div key={continent}>
                    <div className="sticky top-0 z-50 bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">{continent}</span>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">{items.length}</span>
                    </div>
                    {items.map((option) => {
                        const globalIndex = filteredOptions.indexOf(option);
                        const isActive = globalIndex === activeIndex;

                        return (
                            <div
                                id={`region-${globalIndex}`}
                                key={option.id}
                                onClick={() => handleSelect(option)}
                                className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 group/item ${
                                    isActive || option.id === value 
                                    ? 'bg-indigo-50 dark:bg-indigo-500/20' 
                                    : 'hover:bg-indigo-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold transition-colors ${
                                            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400'
                                        }`}>{option.name}</span>
                                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{option.continent}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{option.id}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default RegionAutocomplete;
