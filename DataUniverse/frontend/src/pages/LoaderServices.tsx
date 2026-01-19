import { useState, useEffect } from 'react';
import {
    Upload,
    Play,
    Shield,
    Zap,
    Layers,
    Clock,
    CheckCircle2,
    MoreVertical,
    RefreshCw,
    Pause,
    Plus,
    X,
    Server,
    Activity
} from 'lucide-react';
import {
    getLoaderServices,
    getMapperServices,
    createLoaderService,
    deleteLoaderService,
    executeLoaderService,
    type LoaderService,
    type MapperService
} from '../lib/api';
import LoadingOverlay from '../components/LoadingOverlay';

export default function LoaderServices() {
    const [activeTab, setActiveTab] = useState<'batch' | 'streaming'>('batch');
    const [isLive, setIsLive] = useState(false);
    const [loaders, setLoaders] = useState<LoaderService[]>([]);
    const [mappers, setMappers] = useState<MapperService[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Syncing Loader Services...');
    const [showConfigureModal, setShowConfigureModal] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastExecutionResult, setLastExecutionResult] = useState<any>(null);

    // New Loader Form State
    const [newLoaderName, setNewLoaderName] = useState('');
    const [newTargetTableName, setNewTargetTableName] = useState('');
    const [selectedMapperId, setSelectedMapperId] = useState<number | null>(null);
    const [selectedLoadType, setSelectedLoadType] = useState<'batch' | 'streaming'>('batch');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            setLoadingMessage('Syncing Loader Services...');
            const [loaderData, mapperData] = await Promise.all([
                getLoaderServices(),
                getMapperServices()
            ]);
            setLoaders(loaderData);
            setMappers(mapperData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateLoader = async () => {
        if (!newLoaderName || !selectedMapperId) {
            alert("Please fill in all fields");
            return;
        }

        try {
            setIsLoading(true);
            setLoadingMessage('Initializing Loader...');
            await createLoaderService({
                name: newLoaderName,
                mapper_service_id: selectedMapperId,
                target_entity_name: newTargetTableName,
                load_type: selectedLoadType,
                status: 'active'
            });
            setShowConfigureModal(false);
            setNewLoaderName('');
            setNewTargetTableName('');
            setSelectedMapperId(null);
            loadData();
        } catch (error) {
            console.error("Failed to create loader", error);
            alert("Failed to create loader service");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRunLoader = async (id: number) => {
        try {
            setIsLoading(true);
            setLoadingMessage('Executing Data Load...');
            const result = await executeLoaderService(id);
            setLastExecutionResult(result);
            setShowSuccess(true);
            loadData(); // Refresh statuses
        } catch (error: any) {
            console.error("Execution failed", error);
            alert("Execution failed: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this loader service?")) return;
        try {
            setIsLoading(true);
            setLoadingMessage('Deleting Service...');
            await deleteLoaderService(id);
            loadData();
        } catch (error) {
            console.error("Failed to delete", error);
        } finally {
            setIsLoading(false);
        }
    };

    const batchLoaders = loaders.filter(l => l.load_type === 'batch');
    const streamingLoaders = loaders.filter(l => l.load_type === 'streaming');

    return (
        <div className="space-y-8 p-8 animate-fade-in max-w-[1600px] mx-auto">
            {isLoading && <LoadingOverlay message={loadingMessage} />}

            {/* Execution Success Notification */}
            {showSuccess && (
                <div className="fixed top-8 right-8 z-[60] bg-emerald-600 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-right duration-500 max-w-md">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h3 className="font-black text-lg">Load Successful!</h3>
                        <p className="text-emerald-50 text-xs font-bold uppercase tracking-widest mt-1">
                            {lastExecutionResult?.rows_inserted} rows loaded into {lastExecutionResult?.table_name}
                        </p>
                    </div>
                    <button onClick={() => setShowSuccess(false)} className="ml-4 hover:bg-white/10 p-2 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

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
                    <button
                        onClick={() => setShowConfigureModal(true)}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
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
                    <Layers size={20} /> Batch Load ({batchLoaders.length})
                </button>
                <button
                    onClick={() => setActiveTab('streaming')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black transition-all ${activeTab === 'streaming'
                        ? 'bg-white text-indigo-600 shadow-lg'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Zap size={20} /> Streaming Load ({streamingLoaders.length})
                </button>
            </div>

            {/* Configure Modal */}
            {showConfigureModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configure New Loader</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Ingestion Pipeline Setup</p>
                            </div>
                            <button onClick={() => setShowConfigureModal(false)} className="p-2 hover:bg-white rounded-2xl text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loader Instance Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Salesforce Daily Sync"
                                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all"
                                    value={newLoaderName}
                                    onChange={(e) => setNewLoaderName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Table Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., raw_sales_data"
                                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all"
                                    value={newTargetTableName}
                                    onChange={(e) => setNewTargetTableName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Mapper Service</label>
                                {mappers.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {mappers.map(mapper => (
                                            <button
                                                key={mapper.id}
                                                onClick={() => setSelectedMapperId(mapper.id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedMapperId === mapper.id
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 font-black text-sm">
                                                    <Server size={18} />
                                                    {mapper.name}
                                                </div>
                                                {selectedMapperId === mapper.id && <CheckCircle2 size={18} />}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-rose-50 rounded-2xl text-rose-500 text-xs font-bold text-center border border-rose-100">
                                        No Mapper Services found. Create one first in Data Mapper.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Load Strategy</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSelectedLoadType('batch')}
                                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedLoadType === 'batch'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-50 bg-slate-50 text-slate-400'
                                            }`}
                                    >
                                        <Layers size={24} />
                                        <span className="text-xs font-black uppercase tracking-widest">Batch</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedLoadType('streaming')}
                                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedLoadType === 'streaming'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-50 bg-slate-50 text-slate-400'
                                            }`}
                                    >
                                        <Zap size={24} />
                                        <span className="text-xs font-black uppercase tracking-widest">Streaming</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateLoader}
                                disabled={!newLoaderName || !selectedMapperId}
                                className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3 text-lg"
                            >
                                <Plus size={24} /> Initialize Loader Service
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'batch' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {batchLoaders.length > 0 ? batchLoaders.map((job) => (
                        <div key={job.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex gap-4">
                                    <div className={`p-5 rounded-3xl bg-indigo-50 text-indigo-600`}>
                                        <Clock size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{job.name}</h3>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                                            Mapper: {mappers.find(m => m.id === job.mapper_service_id)?.name || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDelete(job.id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500"><X size={18} /></button>
                                    <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><MoreVertical size={18} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-sm font-black text-emerald-600 capitalize">{job.status}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</p>
                                    <p className="text-sm font-black text-slate-800">{new Date(job.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Throughput</p>
                                    <p className="text-sm font-black text-slate-400">---</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className="text-indigo-500" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Ready for Execution</span>
                                </div>
                                <button
                                    onClick={() => handleRunLoader(job.id)}
                                    className="flex items-center gap-2 text-indigo-600 font-black text-sm hover:gap-3 transition-all"
                                >
                                    Run Now <Play size={14} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
                            <Layers size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Batch Loaders Configured</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {streamingLoaders.length > 0 ? streamingLoaders.map((stream) => (
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
                                            <p className="text-indigo-400/70 font-bold uppercase text-[10px] tracking-widest mt-1">
                                                Mapper: {mappers.find(m => m.id === stream.mapper_service_id)?.name || 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDelete(stream.id)} className="p-2 bg-white/5 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-400"><X size={18} /></button>
                                        <button className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-400"><Pause size={18} /></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-3xl font-black text-white capitalize">{stream.status}</p>
                                            <RefreshCw size={14} className="text-emerald-400 mb-1.5 animate-spin-slow" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingestion</p>
                                        <p className="text-3xl font-black text-white">Active</p>
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
                                    <span className="text-xs font-bold text-slate-400 uppercase">{new Date(stream.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 text-center py-20 bg-slate-900 rounded-[3rem] border-4 border-dashed border-indigo-900/30">
                            <Zap size={48} className="mx-auto text-indigo-900/50 mb-4" />
                            <p className="text-indigo-400/50 font-black uppercase tracking-widest text-xs">No Streaming Services Initialized</p>
                        </div>
                    )}
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
                        All loader services—both batch and streaming—automatically utilize
                        <span className="text-white font-bold"> Mapper Services</span> and
                        <span className="text-white font-bold"> Transformer Templates</span> to ensure schema compliance and apply business rules before data hits the target store.
                    </p>
                </div>
                <button className="relative z-10 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-2xl">
                    Global Pipeline Logs
                </button>
            </div>
        </div>
    );
}
