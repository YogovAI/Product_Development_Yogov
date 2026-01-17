import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Database, Clock, ArrowLeft, Shield,
    Box, Cpu, HardDrive, FileCode, CheckCircle2,
    Settings, Trash2, Calendar, Share2, Activity,
    ChevronRight, Zap, Target
} from 'lucide-react';
import { getExtractor, getSources, deleteExtractorItem, type ExtractorService, type DataSource } from '../lib/api';

export default function ExtractorDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [extractor, setExtractor] = useState<ExtractorService | null>(null);
    const [source, setSource] = useState<DataSource | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        try {
            const exData = await getExtractor(parseInt(id));
            setExtractor(exData);

            const sources = await getSources();
            const src = sources.find(s => s.id === exData.source_id);
            setSource(src || null);
        } catch (err) {
            console.error("Failed to load details", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!extractor || !confirm("Permanently remove this extractor service?")) return;
        try {
            await deleteExtractorItem(extractor.id);
            navigate('/extractors');
        } catch (err) {
            alert("Delete failed");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Accessing Data Universe...</p>
                </div>
            </div>
        );
    }

    if (!extractor) return <div>Extractor not found</div>;

    return (
        <div className="p-8 space-y-8 animate-fade-in max-w-[1400px] mx-auto">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/extractors')}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group"
                >
                    <div className="p-2 bg-white rounded-xl border border-slate-100 group-hover:border-indigo-100 shadow-sm">
                        <ArrowLeft size={18} />
                    </div>
                    Back to Services
                </button>
                <div className="flex gap-3">
                    <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Profile Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Identity */}
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -mr-48 -mt-48 opacity-40 group-hover:opacity-60 transition-opacity" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-6 mb-8 text-indigo-600">
                            <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50">
                                <FileCode size={40} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase tracking-tight">{extractor.name}</h1>
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">Live</span>
                                </div>
                                <p className="text-slate-400 font-bold mt-1">Extraction Service Profile • ID: {extractor.id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Target size={12} /> Target Volume
                                </p>
                                <p className="text-2xl font-black text-slate-900">{extractor.data_volume || 'N/A'}</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Activity size={12} /> Records Scanned
                                </p>
                                <p className="text-2xl font-black text-slate-900">{extractor.records_count.toLocaleString()}</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Clock size={12} /> Last Extraction
                                </p>
                                <p className="text-2xl font-black text-slate-900">
                                    {extractor.last_run ? new Date(extractor.last_run).toLocaleDateString() : 'Active'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Source Ownership Card */}
                <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mb-12 -mr-12" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                <Database size={24} />
                            </div>
                            <Share2 size={20} className="text-white/40" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Source Access Point</h3>
                        <p className="text-2xl font-black tracking-tight mb-4">{source?.name || 'Unknown Source'}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">
                            Protocol: {source?.source_type || 'N/A'}
                        </div>
                    </div>

                    <button className="relative z-10 mt-8 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg shadow-black/10 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                        Inspect Source <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Detailed Schema Section */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <FileCode size={24} className="text-indigo-600" />
                            Python-Standard Schema Design
                        </h3>
                        <p className="text-slate-400 font-bold mt-1 uppercase text-xs tracking-widest">Structural metadata harvesting results</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <Zap size={16} className="text-amber-500" />
                            <span className="text-sm font-black text-slate-600">Optimized for DataFrame Load</span>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"># Index</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Column Identifier</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Schema Type</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Memory Allocation</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Integrity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {extractor.schema_info && Array.isArray(extractor.schema_info) ? (
                                    extractor.schema_info.map((field: any, i: number) => (
                                        <tr key={i} className="group hover:bg-indigo-50/20 transition-all duration-200">
                                            <td className="px-6 py-3">
                                                <span className="text-[10px] font-black text-slate-300 font-mono">[{String(i + 1).padStart(2, '0')}]</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                                                        <Box size={14} />
                                                    </div>
                                                    <span className="font-bold text-slate-800 tracking-tight text-sm uppercase">{field.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                                                    <span className="text-[9px] font-black text-indigo-600 font-mono tracking-widest uppercase">{field.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="text-[10px] font-bold text-slate-500 font-mono italic">
                                                    {field.type === 'object' ? '64-bit Ref' : '64-bit Prim'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                                                    <CheckCircle2 size={10} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Fixed</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic opacity-50">
                                            No schema design detected
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Industrial Capabilities Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                    <Cpu className="text-indigo-400 mb-4" size={32} />
                    <h4 className="text-lg font-black mb-2">Automated Mapping</h4>
                    <p className="text-sm text-slate-400 font-medium">Native integration with Data Mapper services for subsequent ETL pipelines.</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <Shield className="text-indigo-600 mb-4" size={32} />
                    <h4 className="text-lg font-black mb-2 text-slate-800">Governance Ready</h4>
                    <p className="text-sm text-slate-500 font-medium">Full lineage tracking from source access point to target transformation layers.</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <HardDrive className="text-indigo-600 mb-4" size={32} />
                    <h4 className="text-lg font-black mb-2 text-slate-800">IO Optimized</h4>
                    <p className="text-sm text-slate-500 font-medium">Utilizes zero-copy buffers for high-speed parquet and CSV ingestion.</p>
                </div>
            </div>
        </div>
    );
}
