import { useEffect, useRef } from 'react';
import { Terminal, X, Trash2, Download } from 'lucide-react';

export interface LogEntry {
    message: string;
    level: 'info' | 'error' | 'warn' | 'success';
    source: 'frontend' | 'backend';
    timestamp: string;
}

interface LogViewerProps {
    logs: LogEntry[];
    onClose: () => void;
    onClear: () => void;
}

export default function LogViewer({ logs, onClose, onClear }: LogViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const downloadLogs = () => {
        const logText = logs.map(l => `[${l.timestamp}] [${l.source.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etl_job_logs_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed bottom-6 right-6 w-full max-w-2xl z-50 animate-slide-in">
            <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden border-2 border-indigo-100 flex flex-col max-h-[500px]">
                {/* Header */}
                <div className="bg-gray-900 px-6 py-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <Terminal size={18} className="text-indigo-400" />
                        <span className="font-bold text-sm">Execution Logs</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={downloadLogs} className="hover:text-indigo-400 transition-colors" title="Download Logs">
                            <Download size={16} />
                        </button>
                        <button onClick={onClear} className="hover:text-red-400 transition-colors" title="Clear Logs">
                            <Trash2 size={16} />
                        </button>
                        <button onClick={onClose} className="hover:text-gray-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Log List */}
                <div
                    ref={scrollRef}
                    className="flex-1 bg-black/95 p-4 overflow-y-auto font-mono text-xs space-y-1.5 min-h-[300px]"
                >
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 italic">
                            Waiting for logs...
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="flex gap-3 border-b border-white/5 pb-1">
                                <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                                <span className={`shrink-0 font-bold ${log.source === 'frontend' ? 'text-blue-400' : 'text-purple-400'}`}>
                                    {log.source.toUpperCase()}
                                </span>
                                <span className={`break-all ${log.level === 'error' ? 'text-red-400' :
                                    log.level === 'success' ? 'text-green-400' :
                                        log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'
                                    }`}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Stats */}
                <div className="bg-gray-50 px-6 py-2 border-t text-[10px] text-gray-500 flex justify-between">
                    <span>Total entries: {logs.length}</span>
                    <span>Monitoring active</span>
                </div>
            </div>
        </div>
    );
}
