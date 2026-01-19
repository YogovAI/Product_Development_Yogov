import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Database, Clock, ArrowLeft, Shield,
    Settings, Trash2, Calendar, Target,
    CheckCircle2, FileCode, Zap, Filter
} from 'lucide-react';
import { getTransformTemplate, getSources, deleteTransformTemplate, type TransformTemplate, type DataSource } from '../lib/api';

export default function TransformTemplateDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [template, setTemplate] = useState<TransformTemplate | null>(null);
    const [source, setSource] = useState<DataSource | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        try {
            const templateData = await getTransformTemplate(parseInt(id));
            setTemplate(templateData);

            if (templateData.target_source_id) {
                const sources = await getSources();
                const src = sources.find(s => s.id === templateData.target_source_id);
                setSource(src || null);
            }
        } catch (err) {
            console.error("Failed to load details", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!template || !confirm("Permanently remove this transform template?")) return;
        try {
            await deleteTransformTemplate(template.id);
            navigate('/transform');
        } catch (err) {
            alert("Delete failed");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Template Details...</p>
                </div>
            </div>
        );
    }

    if (!template) return <div>Template not found</div>;

    return (
        <div className="p-8 space-y-8 animate-fade-in max-w-[1400px] mx-auto">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/transform')}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group"
                >
                    <div className="p-2 bg-white rounded-xl border border-slate-100 group-hover:border-indigo-100 shadow-sm">
                        <ArrowLeft size={18} />
                    </div>
                    Back to Templates
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/transform', { state: { editTemplate: template } })}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-500 transition-all"
                    >
                        Edit
                    </button>
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
                                <Settings size={40} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{template.name}</h1>
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">Active</span>
                                </div>
                                <p className="text-slate-400 font-bold mt-1">Transform Template • ID: {template.id}</p>
                                {template.description && (
                                    <p className="text-slate-600 font-medium mt-2 text-sm">{template.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Target size={12} /> Target Type
                                </p>
                                <p className="text-2xl font-black text-slate-900">{template.target_type || 'N/A'}</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <FileCode size={12} /> Entity Type
                                </p>
                                <p className="text-2xl font-black text-slate-900">{template.target_entity_type || 'N/A'}</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Database size={12} /> Fields Configured
                                </p>
                                <p className="text-2xl font-black text-slate-900">{template.config.columns.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Source Card */}
                <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mb-12 -mr-12" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                <Database size={24} />
                            </div>
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Target Source</h3>
                        <p className="text-2xl font-black tracking-tight mb-4">{source?.name || 'Not Configured'}</p>
                        {source && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">
                                Type: {source.source_type || source.type || 'N/A'}
                            </div>
                        )}
                        {template.target_entity_name && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">
                                Entity: {template.target_entity_name}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Column Configuration Section */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Filter size={24} className="text-indigo-600" />
                            Column Configuration & Rules
                        </h3>
                        <p className="text-slate-400 font-bold mt-1 uppercase text-xs tracking-widest">Quality rules and business logic definitions</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <Zap size={16} className="text-amber-500" />
                            <span className="text-sm font-black text-slate-600">{template.config.columns.length} Fields</span>
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    {(template.config as any)?.business_rules && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase tracking-[2px] text-gray-500">Business Rules (English)</span>
                                </div>
                                <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-white border border-gray-200 rounded-xl p-3">{(template.config as any).business_rules?.english || '—'}</pre>
                            </div>
                            <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase tracking-[2px] text-gray-500">Business Rules (YAML)</span>
                                </div>
                                <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-white border border-gray-200 rounded-xl p-3 font-mono">{(template.config as any).business_rules?.yaml || '—'}</pre>
                            </div>
                        </div>
                    )}

                    {(template.config as any)?.schema_json || (template.config as any)?.schema_yaml ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase tracking-[2px] text-gray-500">Generated Schema (JSON)</span>
                                </div>
                                <pre className="whitespace-pre-wrap text-xs text-slate-800 bg-white border border-gray-200 rounded-xl p-3 font-mono">
{JSON.stringify((template.config as any).schema_json || {}, null, 2)}
                                </pre>
                            </div>
                            <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase tracking-[2px] text-gray-500">Generated Schema (YAML)</span>
                                </div>
                                <pre className="whitespace-pre-wrap text-xs text-slate-800 bg-white border border-gray-200 rounded-xl p-3 font-mono">
{(template.config as any).schema_yaml || '—'}
                                </pre>
                            </div>
                        </div>
                    ) : null}

                    {template.config.columns.length > 0 ? (
                        <div className="space-y-6">
                            {template.config.columns.map((col, idx) => (
                                <div key={idx} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-200 transition-all">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl font-bold text-indigo-600 shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg">{col.name}</h4>
                                                <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded-lg border border-gray-100">{col.data_type}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Quality Rules */}
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2 block">Quality Rules</span>
                                            <div className="space-y-2">
                                                {col.quality_rules.primary_key && (
                                                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                                        <span className="text-sm font-semibold text-gray-700">Primary Key</span>
                                                    </div>
                                                )}
                                                {col.quality_rules.not_null && (
                                                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                                        <span className="text-sm font-semibold text-gray-700">Not Null</span>
                                                    </div>
                                                )}
                                                {col.quality_rules.format && (
                                                    <div className="p-3 bg-white rounded-xl border border-indigo-100">
                                                        <span className="text-xs font-bold text-gray-400 block mb-1">Format/Constraint</span>
                                                        <span className="text-sm font-medium text-gray-700 font-mono">{col.quality_rules.format}</span>
                                                    </div>
                                                )}
                                                {!col.quality_rules.primary_key && !col.quality_rules.not_null && !col.quality_rules.format && (
                                                    <div className="text-center py-4 bg-white/50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 font-medium italic">
                                                        No quality rules defined
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Business Rules */}
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2 block">Business Rules</span>
                                            {col.business_rules && col.business_rules.length > 0 ? (
                                                <div className="space-y-2">
                                                    {col.business_rules.map((rule: string, rIdx: number) => (
                                                        rule && (
                                                            <div key={rIdx} className="p-3 bg-white rounded-xl border border-indigo-100">
                                                                <span className="text-sm font-medium text-gray-700">{rule}</span>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 bg-white/50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 font-medium italic">
                                                    No business rules defined
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-indigo-50 flex items-center justify-center rounded-3xl text-indigo-400 mb-6">
                                <Database size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">No Columns Configured</h3>
                            <p className="text-gray-500 mt-2 max-w-xs">This template does not have any column configurations yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Metadata Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <Calendar className="text-indigo-600 mb-4" size={32} />
                    <h4 className="text-lg font-black mb-2 text-slate-800">Created</h4>
                    <p className="text-sm text-slate-500 font-medium">
                        {template.created_at ? new Date(template.created_at).toLocaleString() : 'N/A'}
                    </p>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <Shield className="text-indigo-600 mb-4" size={32} />
                    <h4 className="text-lg font-black mb-2 text-slate-800">Template Status</h4>
                    <p className="text-sm text-slate-500 font-medium">Ready for use in ETL pipelines and data transformation workflows.</p>
                </div>
            </div>
        </div>
    );
}
