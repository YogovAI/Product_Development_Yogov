import { useState } from 'react';
import { Upload, Settings, Play, Shield, Zap, Layers, Clock, CheckCircle2, MoreVertical, RefreshCw, BarChart3, Pause } from 'lucide-react';

const BATCH_LOADS = [
    {
        id: 1,
        name: 'Daily EOD Analytics Load',
        target: 'PostgreSQL - Warehouse',
        status: 'scheduled',
        lastRun: '12h ago',
        nextRun: 'in 4h',
        avgDuration: '14m 20s',
        throughput: '1.2M rows',
        successRate: '99.9%'
    },
    {
        id: 2,
        name: 'Weekly Financial Sync',
        target: 'Snowflake - Finance',
        status: 'failed',
        lastRun: '1h ago',
        nextRun: 'Manual',
        avgDuration: '45m 12s',
        throughput: '8.5M rows',
        successRate: '82.4%'
    }
];

const STREAMING_LOADS = [
    {
        id: 1,
        name: 'User Clickstream Feed',
        target: 'MinIO - Silver Layer',
        status: 'streaming',
        uptime: '24d 12h',
        latency: '120ms',
        throughput: '4.5k rec/s',
        eventsToday: '12.4M'
    },
    {
        id: 2,
        name: 'IoT Sensor Telemetry',
        target: 'TimeScale DB',
        status: 'active',
        uptime: '3d 4h',
        latency: '45ms',
        throughput: '850 rec/s',
        eventsToday: '2.8M'
    }
];

export default function LoaderServices() {
    const [activeTab, setActiveTab] = useState<'batch' | 'streaming'>('batch');
    const [isLive, setIsLive] = useState(false);

    return (
        <div className="space-y-8 p-8 animate-fade-in max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
                        Loader <span className="text-indigo-600">Services</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">Orchestrate high-volume data ingestion strategies</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest">Live Monitoring</span>
                        <button
                            onClick={() => setIsLive(!isLive)}
                            className={`ml-2 w-10 h-6 rounded-full transition-colors relative ${isLive ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLive ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>
                    <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                        <Upload size={20} /> Configure Loader
                    </button>
                </div>
            </div>

            {/* Feature Tabs */}
            <div className="flex gap-4 p-2 bg-slate-100/50 rounded-[2rem] w-fit border border-slate-200/50">
                <button
                    onClick={() => setActiveTab('batch')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black transition-all ${activeTab === 'batch'
                        ? 'bg-white text-indigo-600 shadow-lg'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Layers size={20} /> Batch Load
                </button>
                <button
                    onClick={() => setActiveTab('streaming')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black transition-all ${activeTab === 'streaming'
                        ? 'bg-white text-indigo-600 shadow-lg'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Zap size={20} /> Streaming Load
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'batch' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {BATCH_LOADS.map((job) => (
                        <div key={job.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex gap-4">
                                    <div className={`p-5 rounded-3xl ${job.status === 'scheduled' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <Clock size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{job.name}</h3>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">{job.target}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><Settings size={18} /></button>
                                    <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><MoreVertical size={18} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Run</p>
                                    <p className="text-sm font-black text-slate-800">{job.lastRun}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Throughput</p>
                                    <p className="text-sm font-black text-slate-800">{job.throughput}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Success</p>
                                    <p className={`text-sm font-black ${parseFloat(job.successRate) > 95 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {job.successRate}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className={job.status === 'scheduled' ? 'text-indigo-500' : 'text-rose-500'} />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">{job.status}</span>
                                </div>
                                <button className="flex items-center gap-2 text-indigo-600 font-black text-sm hover:gap-3 transition-all">
                                    Run Now <Play size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {STREAMING_LOADS.map((stream) => (
                        <div key={stream.id} className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex gap-4">
                                        <div className="p-5 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/20">
                                            <Zap size={32} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight">{stream.name}</h3>
                                            <p className="text-indigo-400/70 font-bold uppercase text-[10px] tracking-widest mt-1">{stream.target}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400"><BarChart3 size={18} /></button>
                                        <button className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-400"><Pause size={18} /></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingestion Rate</p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-3xl font-black text-white">{stream.throughput}</p>
                                            <RefreshCw size={14} className="text-emerald-400 mb-1.5 animate-spin-slow" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Events Today</p>
                                        <p className="text-3xl font-black text-white">{stream.eventsToday}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="w-1 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                            ))}
                                        </div>
                                        <span className="text-xs font-black uppercase text-indigo-400 tracking-tighter">Live Traffic</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">LATENCY: {stream.latency}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Global Assurance */}
            <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-800 to-transparent" />
                <div className="relative z-10 p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10">
                    <Shield size={40} className="text-indigo-300" />
                </div>
                <div className="relative z-10 flex-1">
                    <h2 className="text-2xl font-black mb-1">Quality Guaranteed Ingestion</h2>
                    <p className="text-indigo-200 font-medium max-w-2xl">
                        All loader services—both batch and streaming—automatically cross-reference
                        <span className="text-white font-bold"> Transformer Templates</span> to ensure schema compliance before any data hits the target store.
                    </p>
                </div>
                <button className="relative z-10 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-2xl">
                    Detailed Logs
                </button>
            </div>
        </div>
    );
}
