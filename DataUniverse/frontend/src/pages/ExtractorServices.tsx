import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, FileCode, Clock, Plus, Database, Trash2, Loader2, Info, Edit3, ExternalLink } from 'lucide-react';
import { getExtractors, createExtractor, updateExtractor, analyzeSource, getSources, deleteExtractorItem, type ExtractorService, type DataSource } from '../lib/api';

export default function ExtractorServices() {
    const navigate = useNavigate();
    const [extractors, setExtractors] = useState<ExtractorService[]>([]);
    const [sources, setSources] = useState<DataSource[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExtractorId, setEditingExtractorId] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [newExtractor, setNewExtractor] = useState({
        name: '',
        source_id: 0,
        status: 'active',
        data_volume: '0 MB',
        records_count: 0,
        schema_info: null as any
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [exData, srcData] = await Promise.all([getExtractors(), getSources()]);
            setExtractors(exData);
            setSources(srcData);
        } catch (err) {
            console.error("Failed to load extractor data", err);
        }
    };

    const filteredExtractors = extractors.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sources.find(s => s.id === ex.source_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSourceSelect = async (sourceId: string) => {
        const id = parseInt(sourceId);
        setNewExtractor(prev => ({ ...prev, source_id: id }));
        if (!id) return;

        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const analysis = await analyzeSource(id);
            setNewExtractor(prev => ({
                ...prev,
                records_count: analysis.records_count,
                data_volume: analysis.data_volume,
                schema_info: analysis.schema
            }));
        } catch (err: any) {
            console.error("Analysis failed", err);
            const msg = err.response?.data?.detail || "Failed to analyze source. Verify file path and access.";
            setAnalysisError(msg);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleEdit = (extractor: ExtractorService) => {
        setEditingExtractorId(extractor.id);
        setNewExtractor({
            name: extractor.name,
            source_id: extractor.source_id,
            status: extractor.status,
            data_volume: extractor.data_volume || '0 MB',
            records_count: extractor.records_count,
            schema_info: extractor.schema_info
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExtractor.source_id) return alert("Please select a data source");

        try {
            if (editingExtractorId) {
                await updateExtractor(editingExtractorId, newExtractor);
            } else {
                await createExtractor(newExtractor);
            }

            setIsModalOpen(false);
            setEditingExtractorId(null);
            setNewExtractor({
                name: '',
                source_id: 0,
                status: 'active',
                data_volume: '0 MB',
                records_count: 0,
                schema_info: null
            });
            loadData();
        } catch (err: any) {
            const msg = err.response?.data?.detail || "Error processing extractor";
            alert(msg);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Delete this extractor service?")) return;
        try {
            await deleteExtractorItem(id);
            loadData();
        } catch (err) {
            alert("Error deleting extractor");
        }
    };

    const openDetails = (id: number) => {
        navigate(`/extractors/${id}`);
    };

    return (
        <div className="space-y-8 p-8 animate-fade-in max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                        Extractor <span className="text-indigo-600">Services</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Orchestrate and monitor high-precision data harvesting</p>
                </div>
                <button
                    onClick={() => {
                        setEditingExtractorId(null);
                        setNewExtractor({
                            name: '',
                            source_id: 0,
                            status: 'active',
                            data_volume: '0 MB',
                            records_count: 0,
                            schema_info: null
                        });
                        setIsModalOpen(true);
                    }}
                    className="relative z-10 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Extractor
                </button>
            </div>


            {/* Search Box - Data Sources Style */}
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Search by service name or source access point..."
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Harvest Operations List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Data Harvest Operations</h3>
                </div>

                <div className="divide-y divide-slate-50">
                    {filteredExtractors.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Download className="text-slate-300" size={40} />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 mb-2">{searchQuery ? 'No results found' : 'No active extractors'}</h4>
                            <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8">
                                {searchQuery ? 'Try adjusting your search query.' : 'Launch your first extraction service to start building your data universe.'}
                            </p>
                        </div>
                    ) : (
                        filteredExtractors.map((ex) => (
                            <div
                                key={ex.id}
                                onClick={() => openDetails(ex.id)}
                                className="px-6 py-4 hover:bg-indigo-50/20 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-3 rounded-xl ${ex.status === 'active' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'}`}>
                                            <FileCode size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-black text-base text-slate-800 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{ex.name}</h4>
                                                <span className="px-2 py-0.5 bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 rounded-lg">ID: {ex.id}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                                    <Database size={12} className="text-indigo-500" />
                                                    {sources.find(s => s.id === ex.source_id)?.name || 'Unknown Source'}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {ex.last_run ? new Date(ex.last_run).toLocaleString() : 'Never Run'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-base font-black text-slate-900">{ex.data_volume}</p>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{ex.records_count.toLocaleString()} Records</p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/extractors/${ex.id}`); }}
                                                className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(ex); }}
                                                className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all shadow-sm"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={(e) => handleDelete(e, ex.id)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                        <h2 className="text-3xl font-black mb-10 text-slate-800 tracking-tight">
                            {editingExtractorId ? 'Update Extractor Profile' : 'Configure New Extractor'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-400">Extractor Service Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold text-slate-700"
                                        value={newExtractor.name}
                                        onChange={e => setNewExtractor({ ...newExtractor, name: e.target.value })}
                                        placeholder="e.g. Sales_Data_Harvester"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-400">Select Data Source Access Point</label>
                                    <select
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-black text-slate-700 appearance-none cursor-pointer"
                                        value={newExtractor.source_id}
                                        onChange={e => handleSourceSelect(e.target.value)}
                                        required
                                        disabled={!!editingExtractorId}
                                    >
                                        <option value="0">Choose an Access Point...</option>
                                        {sources.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.source_type})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Analysis Panel */}
                            {!editingExtractorId && (
                                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                    <div className="p-6 bg-slate-100/50 border-b border-slate-200 flex items-center justify-between">
                                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                                            <Search size={18} className="text-indigo-600" />
                                            Deep Source Analysis
                                        </h3>
                                        {isAnalyzing && (
                                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                                <Loader2 className="animate-spin" size={16} /> Scanning...
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8">
                                        {analysisError && (
                                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                                                <div className="p-1 bg-rose-100 text-rose-600 rounded-lg">
                                                    <Info size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-rose-900 leading-tight">Analysis Blocked</p>
                                                    <p className="text-xs font-bold text-rose-500 mt-0.5">{analysisError}</p>
                                                </div>
                                            </div>
                                        )}

                                        {newExtractor.schema_info ? (
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div className="bg-white p-4 rounded-xl border border-indigo-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Records Found</p>
                                                        <p className="text-xl font-black text-indigo-600">{newExtractor.records_count.toLocaleString()}</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-indigo-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Weight</p>
                                                        <p className="text-xl font-black text-indigo-600">{newExtractor.data_volume}</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-indigo-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schema Type</p>
                                                        <p className="text-xl font-black text-indigo-600">Structured</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-indigo-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Encoding</p>
                                                        <p className="text-xl font-black text-indigo-600">UTF-8</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest mb-4 text-slate-400">Column Metadata ({newExtractor.schema_info.length})</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {newExtractor.schema_info.map((col: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-100">
                                                                <span className="font-black text-sm text-slate-700">{col.name}</span>
                                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">{col.type}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 opacity-40">
                                                <Database size={48} className="mx-auto mb-4 text-slate-300" />
                                                <p className="font-bold text-slate-500 italic">Select a data source to begin automatic schema harvesting</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingExtractorId(null);
                                    }}
                                    className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black transition-all"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newExtractor.schema_info}
                                    className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                                >
                                    {editingExtractorId ? 'Commit Updates' : 'Initialize Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

