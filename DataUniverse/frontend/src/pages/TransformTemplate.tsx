import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Settings,
    CheckCircle,
    Database,
    ArrowRight,
    Search,
    Filter,
    ChevronDown
} from 'lucide-react';
import {
    createTransformTemplate,
    getTransformTemplates,
    deleteTransformTemplate,
    type TransformTemplate,
    getSources,
    testConnection,
    type DataSource,
    getTables,
    getColumns
} from '../lib/api';



export default function TransformTemplatePage() {
    const [templates, setTemplates] = useState<TransformTemplate[]>([]);
    const [sources, setSources] = useState<DataSource[]>([]);
    const [selectedTargetType, setSelectedTargetType] = useState<string>('');
    const [selectedTargetSourceId, setSelectedTargetSourceId] = useState<number | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });
    const [targetLoadType, setTargetLoadType] = useState<string>('');
    const [targetEntityName, setTargetEntityName] = useState<string>('');
    const [tables, setTables] = useState<string[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [columns, setColumns] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [templatesData, sourcesData] = await Promise.all([
                getTransformTemplates(),
                getSources()
            ]);
            console.log('✅ Loaded sources:', sourcesData);
            console.log('✅ Total sources count:', sourcesData.length);
            setTemplates(templatesData);
            setSources(sourcesData);
        } catch (error) {
            console.error("❌ Failed to load data", error);
        }
    };

    const handleTestConnection = async () => {
        if (!selectedTargetSourceId) return;
        setConnectionStatus({ status: 'testing', message: 'Testing connection...' });
        try {
            const result = await testConnection(selectedTargetSourceId);
            setConnectionStatus({
                status: result.success ? 'success' : 'error',
                message: result.message
            });
        } catch (error) {
            setConnectionStatus({ status: 'error', message: 'Connection failed' });
        }
    };

    const handleLoadTypeChange = async (type: string) => {
        setTargetLoadType(type);
        setTargetEntityName('');

        if (type === 'single_table' && selectedTargetSourceId) {
            try {
                const tablesData = await getTables(selectedTargetSourceId);
                setTables(tablesData);
            } catch (error) {
                console.error("Failed to fetch tables", error);
            }
        }
    };

    const handleUpdateRule = (colIndex: number, ruleType: 'quality' | 'business', key: string, value: any) => {
        const newCols = [...columns];
        if (ruleType === 'quality') {
            newCols[colIndex].quality_rules[key] = value;
        } else {
            // Handle business rules (stored as array of strings)
            if (key === 'add') {
                newCols[colIndex].business_rules.push('');
            } else if (key === 'remove') {
                newCols[colIndex].business_rules.splice(parseInt(value), 1);
            } else {
                newCols[colIndex].business_rules[parseInt(key)] = value;
            }
        }
        setColumns(newCols);
    };

    const handleSaveTemplate = async () => {
        if (!templateName || !selectedTargetSourceId || !targetLoadType) {
            alert("Please fill in all required fields (Name, Target System, Entity Configuration)");
            return;
        }

        setIsSaving(true);
        try {
            await createTransformTemplate({
                name: templateName,
                description: templateDescription,
                target_type: selectedTargetType,
                target_source_id: selectedTargetSourceId,
                target_entity_type: targetLoadType,
                target_entity_name: targetEntityName,
                config: { columns }
            });
            alert("Template saved successfully!");
            setTemplateName('');
            setTemplateDescription('');
            setSelectedTargetType('');
            setSelectedTargetSourceId(null);
            setTargetLoadType('');
            setTargetEntityName('');
            setColumns([]);
            setActiveTab('list');
            loadData();
        } catch (error) {
            console.error("Failed to save template", error);
            alert("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this template?")) {
            try {
                await deleteTransformTemplate(id);
                loadData();
            } catch (error) {
                console.error("Failed to delete template", error);
            }
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 space-y-8 animate-fade-in bg-[#f8fafc]">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        Transformer <span className="text-indigo-600">Templates</span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Define target schemas, quality rules, and business logic</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border-2 border-gray-100">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
                    >
                        Browse Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
                    >
                        Create New
                    </button>
                </div>
            </header>

            {activeTab === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="glass-panel p-6 rounded-3xl border border-white/50 shadow-xl hover:shadow-2xl transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Settings size={24} />
                                </div>
                                <button
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{template.name}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description || 'No description provided'}</p>

                            <div className="flex flex-col gap-2 text-xs font-bold text-gray-400 bg-gray-50 p-4 rounded-xl mb-4">
                                <div className="flex items-center gap-2">
                                    <Database size={14} className="text-emerald-500" />
                                    Target: {template.target_type} ({template.target_entity_name || 'Configured'})
                                </div>

                                <div className="flex items-center gap-2 border-t border-gray-100 pt-2 mt-1">
                                    <Settings size={14} />
                                    {template.config.columns.length} Fields Configured
                                </div>
                            </div>

                            <button className="w-full py-3 bg-white border-2 border-indigo-50 text-indigo-600 font-bold rounded-2xl group-hover:border-indigo-600 transition-all flex items-center justify-center gap-2">
                                View Details <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="inline-block p-6 bg-indigo-50 rounded-full text-indigo-600 mb-4">
                                <Plus size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">No Templates Found</h2>
                            <p className="text-gray-500 mt-2">Create your first transformation template to get started</p>
                            <button
                                onClick={() => setActiveTab('create')}
                                className="mt-6 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all"
                            >
                                Create Template
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Sidebar: Details */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="glass-panel p-6 rounded-3xl shadow-xl">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <CheckCircle className="text-indigo-600" size={20} />
                                Target System Details
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Template Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Salesforce to Snowflake Sync"
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700"
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Target Type</label>
                                    <div className="relative group mb-4">
                                        <select
                                            className="w-full p-4 bg-gray-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl transition-all outline-none appearance-none font-bold text-slate-700 cursor-pointer shadow-sm hover:border-emerald-200"
                                            value={selectedTargetType}
                                            onChange={e => {
                                                setSelectedTargetType(e.target.value);
                                                setSelectedTargetSourceId(null);
                                                setConnectionStatus({ status: 'idle', message: '' });
                                                setTargetLoadType('');
                                                setTargetEntityName('');
                                                setTables([]);
                                            }}
                                        >
                                            <option value="">Select Target Type...</option>
                                            {['RDBMS', 'Flat Files', 'API', 'Websites Scrap', 'Datalake/Lakehouse', 'NO SQL'].map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>

                                    {selectedTargetType && (
                                        <div className="animate-fade-in space-y-4">
                                            <div>
                                                <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">
                                                    Target Source
                                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                                        ({sources.filter(s => {
                                                            if (s.source_type === selectedTargetType) return true;
                                                            if (s.type === selectedTargetType) return true;
                                                            const type = (s.type || '').toLowerCase();
                                                            if (selectedTargetType === 'RDBMS') return ['postgres', 'mysql', 'mssql', 'oracle', 'sqlite', 'sql', 'database'].some(t => type.includes(t));
                                                            if (selectedTargetType === 'Flat Files') return ['csv', 'excel', 'json', 'xml', 'parquet', 'file'].some(t => type.includes(t));
                                                            if (selectedTargetType === 'NO SQL') return ['mongo', 'cassandra', 'redis'].some(t => type.includes(t));
                                                            return false;
                                                        }).length} available)
                                                    </span>
                                                </label>
                                                <div className="relative group">
                                                    <select
                                                        className="w-full p-4 bg-gray-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl transition-all outline-none appearance-none font-bold text-slate-700 cursor-pointer shadow-sm hover:border-emerald-200"
                                                        value={selectedTargetSourceId || ''}
                                                        onChange={e => {
                                                            setSelectedTargetSourceId(Number(e.target.value));
                                                            setConnectionStatus({ status: 'idle', message: '' });
                                                        }}
                                                    >
                                                        <option value="">Select Target Source...</option>
                                                        {sources
                                                            .filter(s => {
                                                                console.log('Filtering source:', s.name, 'source_type:', s.source_type, 'type:', s.type, 'selectedTargetType:', selectedTargetType);

                                                                // Direct match on source_type or type
                                                                if (s.source_type === selectedTargetType) {
                                                                    console.log('  ✓ Matched on source_type');
                                                                    return true;
                                                                }
                                                                if (s.type === selectedTargetType) {
                                                                    console.log('  ✓ Matched on type');
                                                                    return true;
                                                                }

                                                                // Fuzzy matching for backward compatibility
                                                                const type = (s.type || '').toLowerCase();
                                                                if (selectedTargetType === 'RDBMS' && ['postgres', 'mysql', 'mssql', 'oracle', 'sqlite', 'sql', 'database'].some(t => type.includes(t))) {
                                                                    console.log('  ✓ Matched RDBMS fuzzy');
                                                                    return true;
                                                                }
                                                                if (selectedTargetType === 'Flat Files' && ['csv', 'excel', 'json', 'xml', 'parquet', 'file'].some(t => type.includes(t))) {
                                                                    console.log('  ✓ Matched Flat Files fuzzy');
                                                                    return true;
                                                                }
                                                                if (selectedTargetType === 'NO SQL' && ['mongo', 'cassandra', 'redis'].some(t => type.includes(t))) {
                                                                    console.log('  ✓ Matched NO SQL fuzzy');
                                                                    return true;
                                                                }

                                                                console.log('  ✗ No match');
                                                                return false;
                                                            })
                                                            .map(source => (
                                                                <option key={source.id} value={source.id}>
                                                                    {source.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <ChevronDown size={18} />
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedTargetSourceId && (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleTestConnection}
                                                        disabled={connectionStatus.status === 'testing'}
                                                        className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${connectionStatus.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                            connectionStatus.status === 'error' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-800 text-white hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {connectionStatus.status === 'testing' ? 'Verifying...' : 'Test Connection'}
                                                    </button>
                                                    {connectionStatus.status === 'success' && <CheckCircle size={20} className="text-emerald-500 animate-bounce" />}
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Load Type</label>
                                                <div className="relative group">
                                                    <select
                                                        className="w-full p-4 bg-gray-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl transition-all outline-none appearance-none font-bold text-slate-700 cursor-pointer shadow-sm hover:border-emerald-200"
                                                        value={targetLoadType}
                                                        onChange={e => handleLoadTypeChange(e.target.value)}
                                                    >
                                                        <option value="">Select Load Type...</option>
                                                        <option value="single_table">Single Table</option>
                                                        <option value="multi_table">Multi Table</option>
                                                        <option value="adhoc">Adhoc Load</option>
                                                        <option value="api">API Load</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <ChevronDown size={18} />
                                                    </div>
                                                </div>
                                            </div>

                                            {targetLoadType === 'single_table' && (
                                                <div className="animate-fade-in">
                                                    <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Table Name</label>
                                                    <div className="relative group">
                                                        <select
                                                            className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all outline-none appearance-none font-bold text-slate-700"
                                                            value={targetEntityName}
                                                            onChange={async e => {
                                                                const tableName = e.target.value;
                                                                setTargetEntityName(tableName);
                                                                if (tableName && selectedTargetSourceId) {
                                                                    try {
                                                                        const cols = await getColumns(selectedTargetSourceId, tableName);
                                                                        setColumns(cols);
                                                                    } catch (error) {
                                                                        console.error("Failed to fetch columns", error);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Select Table...</option>
                                                            {tables.map(table => (
                                                                <option key={table} value={table}>{table}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown size={18} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {targetLoadType === 'adhoc' && (
                                                <div className="animate-fade-in">
                                                    <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">New Table Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter new table name (optional)..."
                                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700"
                                                        value={targetEntityName}
                                                        onChange={e => setTargetEntityName(e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {targetLoadType === 'api' && (
                                                <div className="animate-fade-in">
                                                    <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">API Endpoint</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://api.example.com/v1/endpoint"
                                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700"
                                                        value={targetEntityName}
                                                        onChange={e => setTargetEntityName(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                            {targetLoadType === 'multi_table' && (
                                                <div className="animate-fade-in p-4 bg-yellow-50 text-yellow-700 rounded-2xl text-sm font-semibold border-2 border-yellow-100">
                                                    Multi-table configuration is handled in the Data Mapper service.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Brief Description</label>
                                    <textarea
                                        placeholder="Describe the transformation objective..."
                                        rows={2}
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all outline-none resize-none"
                                        value={templateDescription}
                                        onChange={e => setTemplateDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-3xl shadow-xl bg-slate-900 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-16 -mt-16" />
                            <h2 className="text-xl font-bold mb-4 relative z-10">Blueprint Summary</h2>
                            <div className="space-y-4 opacity-90 relative z-10">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                    <span className="text-xs font-medium text-slate-400">Total Fields:</span>
                                    <span className="font-bold text-indigo-400">{columns.length}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                    <span className="text-xs font-medium text-slate-400">Quality Gates:</span>
                                    <span className="font-bold text-emerald-400">
                                        {columns.reduce((acc, col) => acc + Object.values(col.quality_rules).filter(v => v === true || v !== '').length, 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                    <span className="text-xs font-medium text-slate-400">Business Logic:</span>
                                    <span className="font-bold text-amber-400">
                                        {columns.reduce((acc, col) => acc + col.business_rules.length, 0)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={isSaving || !templateName || !selectedTargetType || !selectedTargetSourceId || !targetLoadType}
                                className="w-full mt-6 py-4 bg-indigo-600 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none relative z-10"
                            >
                                {isSaving ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Finalizing...
                                    </div>
                                ) : 'Register Transformer Template'}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 flex flex-col h-[700px]">
                        <div className="glass-panel p-6 rounded-3xl shadow-xl overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Filter className="text-indigo-600" size={20} />
                                    Rule Configuration
                                </h2>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search columns..."
                                        className="pl-11 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none w-64"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {columns.length > 0 ? (
                                    <div className="space-y-4">
                                        {columns.map((col, idx) => (
                                            <div key={idx} className="p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl hover:border-indigo-200 transition-all">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl font-bold text-indigo-600 shadow-sm">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-800">{col.name}</h4>
                                                            <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded-lg border border-gray-100">{col.data_type}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Quality Rules */}
                                                    <div className="space-y-3">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2 block">Quality Rules</span>
                                                        <label className="flex items-center gap-3 p-3 bg-white rounded-2xl cursor-pointer hover:shadow-sm transition-all border border-transparent hover:border-indigo-100">
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                                                                checked={col.quality_rules.primary_key}
                                                                onChange={e => handleUpdateRule(idx, 'quality', 'primary_key', e.target.checked)}
                                                            />
                                                            <span className="text-sm font-semibold text-gray-700">Primary Key</span>
                                                        </label>
                                                        <label className="flex items-center gap-3 p-3 bg-white rounded-2xl cursor-pointer hover:shadow-sm transition-all border border-transparent hover:border-indigo-100">
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                                                                checked={col.quality_rules.not_null}
                                                                onChange={e => handleUpdateRule(idx, 'quality', 'not_null', e.target.checked)}
                                                            />
                                                            <span className="text-sm font-semibold text-gray-700">Not Null</span>
                                                        </label>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-400 mb-1 block ml-1">Format/Constraint</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g., numeric, email, regex"
                                                                className="w-full p-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:border-indigo-600 outline-none"
                                                                value={col.quality_rules.format}
                                                                onChange={e => handleUpdateRule(idx, 'quality', 'format', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Business Rules */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Business Rules</span>
                                                            <button
                                                                onClick={() => handleUpdateRule(idx, 'business', 'add', null)}
                                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                        {col.business_rules.map((rule: string, rIdx: number) => (
                                                            <div key={rIdx} className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Custom rule..."
                                                                    className="flex-1 p-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:border-indigo-600 outline-none"
                                                                    value={rule}
                                                                    onChange={e => handleUpdateRule(idx, 'business', String(rIdx), e.target.value)}
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateRule(idx, 'business', 'remove', String(rIdx))}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {col.business_rules.length === 0 && (
                                                            <div className="text-center py-4 bg-white/50 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400 font-medium italic">
                                                                No business rules defined
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-12">
                                        <div className="w-20 h-20 bg-indigo-50 flex items-center justify-center rounded-3xl text-indigo-400 mb-6">
                                            <Database size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800">No Target Entity Configured</h3>
                                        <p className="text-gray-500 mt-2 max-w-xs">Configure the target entity in the sidebar to populate columns.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
