
import React, { useState, useMemo } from 'react';
import { DebugData, AppState } from '../types';
import { Icons } from '../constants';

interface DebugConsoleProps {
  data: DebugData;
  state: AppState;
  isOpen: boolean;
  onToggle: () => void;
}

// Recursive component to render JSON safely. Memoized for performance.
const JsonNode = React.memo(({ value }: { value: any }) => {
  if (value === null) return <span className="text-slate-500">null</span>;
  if (typeof value === 'boolean') return <span className="text-blue-600 dark:text-blue-400">{value.toString()}</span>;
  if (typeof value === 'number') return <span className="text-amber-600 dark:text-amber-400">{value}</span>;
  if (typeof value === 'string') return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>;
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">[]</span>;
    return (
      <div className="ml-4 border-l border-slate-200 dark:border-slate-700/50 pl-2">
        <span className="text-slate-500 dark:text-slate-400">[</span>
        {value.map((item, i) => (
          <div key={i}>
            <JsonNode value={item} />
            {i < value.length - 1 && <span className="text-slate-500">,</span>}
          </div>
        ))}
        <span className="text-slate-500 dark:text-slate-400">]</span>
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return <span className="text-slate-400">{'{}'}</span>;
    return (
      <div className="ml-4 border-l border-slate-200 dark:border-slate-700/50 pl-2">
        <span className="text-slate-500 dark:text-slate-400">{'{'}</span>
        {keys.map((key, i) => (
          <div key={key} className="flex flex-wrap">
            <span className="text-indigo-600 dark:text-indigo-300 mr-1">"{key}":</span>
            <JsonNode value={value[key]} />
            {i < keys.length - 1 && <span className="text-slate-500">,</span>}
          </div>
        ))}
        <span className="text-slate-500 dark:text-slate-400">{'}'}</span>
      </div>
    );
  }

  return <span className="text-slate-500 dark:text-slate-400">{String(value)}</span>;
});

const DebugConsole: React.FC<DebugConsoleProps> = ({ data, state, isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'state' | 'request' | 'response' | 'gemini' | 'logs' | 'network'>('summary');
  const [logFilter, setLogFilter] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);
  const [height, setHeight] = useState(400);

  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard) {
        console.warn('Clipboard API not available');
        return;
    }
    navigator.clipboard.writeText(text).catch(err => {
        console.warn('Failed to copy to clipboard:', err);
    });
  };

  const copyAllLogs = () => {
    const allLogs = data.logs.map(l => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    copyToClipboard(allLogs);
  };

  const toggleLogExpansion = (index: number) => {
    setExpandedLogs(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const filteredLogs = useMemo(() => {
    if (!logFilter) return data.logs;
    const lower = logFilter.toLowerCase();
    return data.logs.filter(l => 
      l.message.toLowerCase().includes(lower) || 
      l.level.toLowerCase().includes(lower)
    );
  }, [data.logs, logFilter]);

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        const sysInfo = `
User Agent: ${navigator.userAgent}
Screen: ${window.screen.width}x${window.screen.height}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
Language: ${navigator.language}
        `.trim();
        
        const totalLatency = data.endTime && data.startTime 
            ? new Date(data.endTime).getTime() - new Date(data.startTime).getTime() 
            : 0;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
              <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex justify-between">
                  <span>Operation Summary</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{data.mode.toUpperCase()} MODE</span>
              </h4>
              <pre className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono-dense break-words leading-relaxed">
                {data.summary || '// Waiting for operation to complete...'}
              </pre>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4">
                 <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Total Duration</span>
                    <span className="text-lg font-mono-dense text-slate-900 dark:text-white">{totalLatency}ms</span>
                 </div>
                 <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Timestamp</span>
                    <span className="text-xs font-mono-dense text-slate-600 dark:text-slate-300">{data.startTime ? new Date(data.startTime).toLocaleTimeString() : '--:--'}</span>
                 </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
               <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Environment Telemetry</h4>
               <pre className="text-[10px] text-indigo-600 dark:text-indigo-300 font-mono-dense whitespace-pre-wrap">{sysInfo}</pre>
            </div>
          </div>
        );

      case 'state':
        return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
             <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Current App State</span>
                <button 
                    onClick={() => copyToClipboard(JSON.stringify(state, null, 2))}
                    className="text-[9px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-2 py-0.5 rounded transition-colors"
                >
                    Copy JSON
                </button>
             </div>
             <div className="p-4 overflow-auto custom-scrollbar flex-grow">
                <div className="font-mono text-[11px]">
                    <JsonNode value={state} />
                </div>
             </div>
          </div>
        );

      case 'logs':
        return (
          <div className="relative h-full flex flex-col">
            <div className="flex justify-between items-center mb-2 sticky top-0 z-10 bg-white dark:bg-[#0f172a] py-1 border-b border-slate-200 dark:border-slate-800 gap-4">
               <div className="relative flex-grow">
                   <input 
                     type="text" 
                     placeholder="Filter logs (e.g. error, warn)..." 
                     value={logFilter}
                     onChange={(e) => setLogFilter(e.target.value)}
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[10px] text-slate-900 dark:text-white focus:border-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500"
                   />
               </div>
               <button onClick={copyAllLogs} className="text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-3 py-1 rounded border border-slate-300 dark:border-slate-600 transition-colors whitespace-nowrap">Copy All</button>
            </div>
            <div className="space-y-1 overflow-auto custom-scrollbar flex-grow pb-4">
              {filteredLogs.length === 0 && <div className="text-slate-500 dark:text-slate-600 text-[10px] italic p-2">No logs match your filter.</div>}
              {filteredLogs.map((log, i) => {
                const isExpanded = expandedLogs.includes(i);
                const isLong = log.message.length > 200;
                return (
                  <div key={i} className="flex gap-3 text-[11px] font-mono-dense border-b border-slate-100 dark:border-slate-800/50 pb-2 mb-2 last:border-0 items-start hover:bg-slate-50 dark:hover:bg-white/5 p-1 rounded transition-colors group">
                    <span className="text-slate-500 dark:text-slate-600 shrink-0 select-none w-20 group-hover:text-slate-700 dark:group-hover:text-slate-400 transition-colors">{log.timestamp.split('T')[1].replace('Z','')}</span>
                    <span className={`uppercase font-bold shrink-0 w-12 select-none text-center rounded px-1 text-[9px] py-0.5 ${
                        log.level === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50' : 
                        log.level === 'warn' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50' : 
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                    }`}>{log.level.substring(0,4)}</span>
                    <div className="flex-grow min-w-0">
                      <div 
                        className={`text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap ${!isExpanded && isLong ? 'cursor-pointer' : ''}`}
                        onClick={() => isLong && toggleLogExpansion(i)}
                      >
                         {isExpanded || !isLong ? log.message : `${log.message.substring(0, 200)}...`}
                      </div>
                      {isLong && (
                        <button 
                          onClick={() => toggleLogExpansion(i)}
                          className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 mt-1 underline decoration-dashed"
                        >
                          {isExpanded ? 'Show Less' : 'Expand Log'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'request':
        if (data.batchRequests && data.batchRequests.length > 0) {
            return (
                <div className="flex flex-col h-full gap-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Batch Requests ({data.batchRequests.length})</div>
                    {data.batchRequests.map((req, idx) => (
                        <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{req.scenarioName}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                    req.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                                    req.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                }`}>{req.status}</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900">
                                <div className="flex justify-between items-center mb-2">
                                   <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">{req.request.method}</span>
                                   <button onClick={() => copyToClipboard(req.request.curl)} className="text-[9px] text-indigo-500 hover:text-indigo-700">Copy cURL</button>
                                </div>
                                <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 break-all mb-2">{req.request.url}</div>
                                <details className="group/details">
                                    <summary className="text-[9px] font-bold text-slate-500 cursor-pointer hover:text-indigo-500 select-none">Show Body</summary>
                                    <div className="mt-2 pl-2 border-l border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                                        <JsonNode value={req.request.body} />
                                    </div>
                                </details>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (!data.request) return <div className="text-slate-500 text-[10px] italic p-4">// No request data available yet</div>;
        return (
          <div className="flex flex-col h-full gap-4">
             <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Endpoint</span>
                   <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">{data.request.method}</span>
                </div>
                <div className="text-xs font-mono text-slate-900 dark:text-white break-all">{data.request.url}</div>
             </div>
             
             {data.request.curl && (
               <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg relative group">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[10px] font-bold text-slate-500 uppercase">cURL Command</span>
                     <button onClick={() => copyToClipboard(data.request?.curl || '')} className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white transition-colors">Copy</button>
                  </div>
                  <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-all max-h-32 overflow-y-auto custom-scrollbar">{data.request.curl}</pre>
               </div>
             )}

             <div className="flex-grow flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-auto custom-scrollbar">
               <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">JSON Body</div>
               <div className="font-mono text-[11px]">
                  <JsonNode value={data.request.body} />
               </div>
             </div>
          </div>
        );

      case 'response':
        if (data.batchRequests && data.batchRequests.length > 0) {
            return (
                <div className="flex flex-col h-full gap-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Batch Responses ({data.batchRequests.length})</div>
                    {data.batchRequests.map((req, idx) => (
                        <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{req.scenarioName}</span>
                                {req.response && (
                                    <button 
                                        onClick={() => copyToClipboard(JSON.stringify(req.response, null, 2))}
                                        className="text-[9px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-white px-2 py-0.5 rounded"
                                    >
                                        Copy JSON
                                    </button>
                                )}
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 overflow-auto max-h-[300px] custom-scrollbar">
                                {req.response ? (
                                    <div className="font-mono text-[10px]">
                                        <JsonNode value={req.response} />
                                    </div>
                                ) : req.error ? (
                                    <div className="text-red-500 text-[10px] font-mono">{req.error}</div>
                                ) : (
                                    <div className="text-slate-400 text-[10px] italic">Waiting for response...</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Response Body</span>
                {data.response && (
                    <button 
                        onClick={() => copyToClipboard(JSON.stringify(data.response, null, 2))}
                        className="text-[9px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-2 py-0.5 rounded transition-colors"
                    >
                        Copy JSON
                    </button>
                )}
            </div>
            <div className="p-4 overflow-auto custom-scrollbar flex-grow">
                {data.response ? (
                <div className="font-mono text-[11px]">
                    <JsonNode value={data.response} />
                </div>
                ) : (
                <div className="text-slate-500 text-[10px] italic">// No response data available yet</div>
                )}
            </div>
          </div>
        );

      case 'gemini':
         if (!data.geminiDebug) return <div className="text-slate-500 text-[10px] italic p-4">// No Gemini debug data. Run analysis to populate.</div>;
         return (
            <div className="flex flex-col h-full gap-4">
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                     <Icons.Cloud />
                     <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Gemini 3 Flash Preview</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{data.geminiDebug.timestamp}</span>
               </div>
               
               <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                      <h5 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">System Prompt</h5>
                      <button onClick={() => copyToClipboard(data.geminiDebug?.prompt || '')} className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white">Copy</button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-y-auto max-h-[150px] custom-scrollbar">
                     <pre className="text-[10px] text-emerald-600 dark:text-emerald-300 font-mono whitespace-pre-wrap">{data.geminiDebug.prompt}</pre>
                  </div>
               </div>

               <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                      <h5 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Raw Model Response</h5>
                      <button onClick={() => copyToClipboard(data.geminiDebug?.responseRaw || '')} className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white">Copy</button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-y-auto flex-grow custom-scrollbar">
                     <pre className="text-[10px] text-blue-600 dark:text-blue-300 font-mono whitespace-pre-wrap">{data.geminiDebug.responseRaw}</pre>
                  </div>
               </div>
            </div>
         );

      case 'network':
        if (data.network.length === 0) return <div className="text-slate-500 text-[10px] italic p-4">No network traffic recorded.</div>;
        return (
          <div className="space-y-3 pb-4">
            {data.network.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-slate-900/50 p-3 rounded border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${entry.method === 'POST' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{entry.method}</span>
                     <span className="text-[10px] text-slate-500">{entry.timestamp.split('T')[1].replace('Z','')}</span>
                     {entry.latencyMs !== undefined && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${entry.latencyMs > 500 ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20'}`}>
                            {entry.latencyMs}ms
                        </span>
                     )}
                     {entry.status && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${entry.status >= 400 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            HTTP {entry.status}
                        </span>
                     )}
                   </div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                        onClick={() => copyToClipboard(entry.curl || '')}
                        className="text-[9px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white underline decoration-dashed"
                        title="Copy as cURL"
                       >
                        cURL
                       </button>
                   </div>
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono-dense break-all bg-slate-50 dark:bg-black/30 p-2 rounded mb-2 border border-slate-200 dark:border-black/50 select-text">
                  {entry.url}
                </div>
                <details className="group/details">
                    <summary className="text-[9px] font-bold text-slate-500 cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 select-none flex items-center gap-1">
                        <svg className="w-2 h-2 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        Payload
                    </summary>
                    <div className="mt-2 pl-2 border-l border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                       <JsonNode value={entry.body} />
                    </div>
                </details>
                {entry.responseBody && (
                  <details className="group/details mt-1">
                      <summary className="text-[9px] font-bold text-slate-500 cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 select-none flex items-center gap-1">
                          <svg className="w-2 h-2 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          Response
                      </summary>
                      <div className="mt-2 pl-2 border-l border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                         <JsonNode value={entry.responseBody} />
                      </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        );
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[9999] flex flex-col transition-all duration-300 ease-out"
      style={{ height: `${height}px` }}
    >
      {/* Resizer Handle */}
      <div 
        className="w-full h-1.5 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-indigo-500 cursor-ns-resize transition-colors flex justify-center items-center group absolute top-0 left-0 z-20"
        onMouseDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = height;
            const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = startHeight + (startY - moveEvent.clientY);
                setHeight(Math.max(200, Math.min(window.innerHeight - 50, newHeight)));
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }}
      >
        <div className="w-16 h-1 bg-slate-300 dark:bg-slate-600 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
      </div>

      {/* Header */}
      <div className="bg-slate-50/80 dark:bg-[#020617]/80 backdrop-blur-sm px-4 py-2 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none pt-3 gap-3 md:gap-0">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
             <Icons.Terminal />
             <span className="text-xs font-bold uppercase tracking-wider">DevOps Console</span>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
            data.status === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : 
            data.status === 'running' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 animate-pulse border-amber-200 dark:border-amber-900' : 
            'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
          }`}>
            {data.status}
          </span>
          {/* Mobile Close Button */}
          <button onClick={onToggle} className="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-800/50 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" /></svg>
          </button>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            <div className="flex bg-white/50 dark:bg-slate-800/50 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700/50 whitespace-nowrap">
                {['summary', 'state', 'logs', 'request', 'response', 'gemini', 'network'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all rounded-md ${
                        activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}
                >
                    {tab}
                </button>
                ))}
            </div>
            <div className="hidden md:block h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button onClick={onToggle} className="hidden md:block text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-slate-800/50 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" /></svg>
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-auto p-6 custom-scrollbar bg-transparent">
        <div className="max-w-7xl mx-auto w-full h-full">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DebugConsole;
