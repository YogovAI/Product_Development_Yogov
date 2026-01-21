import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    Trash2,
    Settings,
    CheckCircle,
    Database,
    ArrowRight,
    ChevronDown,
    Save,
    X,
    Edit3
} from 'lucide-react';
import yaml from 'js-yaml';
import {
    createTransformTemplate,
    getTransformTemplates,
    deleteTransformTemplate,
    updateTransformTemplate,
    type TransformTemplate,
    getSources,
    testConnection,
    type DataSource,
    getTables,
    getColumns,
    getExtractors,
    type ExtractorService,
    generateBusinessRules
} from '../lib/api';

const Modal = ({ title, isOpen, onClose, children, actions }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
                    {children}
                </div>
                <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <X size={18} /> Close
                    </button>
                    {actions}
                </div>
            </div>
        </div>
    );
};

export default function TransformTemplatePage() {
    const navigate = useNavigate();
    const location = useLocation() as any;
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
    const [extractors, setExtractors] = useState<ExtractorService[]>([]);
    const [selectedExtractorId, setSelectedExtractorId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);

    // New State for Advanced Configuration
    // New State for Unified Config
    const [unifiedConfigJsonString, setUnifiedConfigJsonString] = useState('{\n  "columns": []\n}');
    const [finalYaml, setFinalYaml] = useState('');
    const [newRuleType, setNewRuleType] = useState('');
    const [newRuleParams, setNewRuleParams] = useState<any>({});
    const [dataLoadStrategy, setDataLoadStrategy] = useState<string>('Full Load');
    const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
    const [isGeneratingRules, setIsGeneratingRules] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const editTemplate: TransformTemplate | undefined = location?.state?.editTemplate;
        if (editTemplate) {
            setEditingTemplateId(editTemplate.id);
            setActiveTab('create');
            setTemplateName(editTemplate.name);
            setTemplateDescription(editTemplate.description || '');
            setSelectedTargetType(editTemplate.target_type || '');
            setSelectedTargetSourceId(editTemplate.target_source_id || null);
            setTargetLoadType(editTemplate.target_entity_type || '');
            setTargetEntityName(editTemplate.target_entity_name || '');
            setColumns(editTemplate.config?.columns || []);
            setDataLoadStrategy(editTemplate.config?.load_strategy || 'Full Load');
            setFinalYaml(editTemplate.config?.business_rules?.final_yaml || '');

            // Auto-hydrate columns when editing existing template if missing
            if ((editTemplate.target_entity_type === 'single_table') &&
                (!editTemplate.config?.columns || editTemplate.config.columns.length === 0) &&
                editTemplate.target_source_id && editTemplate.target_entity_name) {
                hydrateColumnsFromTable(editTemplate.target_source_id, editTemplate.target_entity_name);
            }

            if ((editTemplate.target_entity_type === 'adhoc') &&
                (!editTemplate.config?.columns || editTemplate.config.columns.length === 0)) {
                getExtractors()
                    .then(exData => {
                        setExtractors(exData);
                        const first = exData[0];
                        if (first) {
                            hydrateColumnsFromExtractor(first.id);
                            setSelectedExtractorId(first.id);
                        }
                    })
                    .catch(err => console.error("Failed to load extractors", err));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location?.state]);

    // Live Unified Config Sync
    useEffect(() => {
        const schema = buildSchemaFromColumns(columns);
        const json = JSON.stringify(schema, null, 2);
        setUnifiedConfigJsonString(json);

        try {
            setFinalYaml(yaml.dump(schema));
        } catch (e) {
            console.warn("YAML generation failed", e);
        }
    }, [columns]);

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

        if (type === 'adhoc') {
            try {
                const exData = await getExtractors();
                setExtractors(exData);
            } catch (error) {
                console.error("Failed to load extractors", error);
            }
        }
    };

    const mapToColumnShape = (c: any) => ({
        name: c.name || c.column_name,
        type: c.type || c.data_type || 'TEXT',
        nullable: c.nullable !== false,
        source_column: c.source_column || c.name || c.column_name,
        pg_type: c.pg_type || c.type || c.data_type || 'TEXT',
        quality_rules: c.quality_rules || [],
        business_rules: c.business_rules || []
    });

    const buildSchemaFromColumns = (cols: any[]) => {
        return {
            columns: (cols || []).map(c => ({
                name: c.name,
                type: c.type || c.data_type,
                nullable: c.nullable,
                source_column: c.source_column,
                pg_type: c.pg_type,
                quality_rules: c.quality_rules || [],
                business_rules: c.business_rules || []
            }))
        };
    };

    const hydrateColumnsFromTable = async (sourceId: number, tableName: string) => {
        try {
            const cols = await getColumns(sourceId, tableName);
            console.log('🔎 hydrateColumnsFromTable raw cols:', cols);
            const shaped = cols.map((c: any) =>
                mapToColumnShape({
                    name: c.name || c.column_name || '',
                    type: c.data_type || c.type || 'text'
                })
            );
            console.log('🔎 hydrateColumnsFromTable shaped cols:', shaped);
            setColumns(shaped);
        } catch (error) {
            console.error("Failed to fetch columns", error);
        }
    };

    const hydrateColumnsFromExtractor = (extractorId: number) => {
        const extractor = extractors.find(e => e.id === extractorId);
        if (extractor && extractor.schema_info) {
            let fields = [];
            try {
                const info = typeof extractor.schema_info === 'string'
                    ? JSON.parse(extractor.schema_info)
                    : extractor.schema_info;

                fields = info.fields || info.schema || [];
                if (Array.isArray(info)) fields = info;
            } catch (e) {
                console.error("Failed to parse extractor schema_info", e);
            }

            const shapedColumns = fields.map((f: any) => mapToColumnShape({ name: f.name, type: f.type || f.data_type || 'text' }));
            setColumns(shapedColumns);

            // Create schema with metadata
            const schemaWithMetadata = {
                metadata: {
                    total_records: extractor.records_count || 0,
                    memory_size: extractor.data_volume || '0MB'
                },
                columns: buildSchemaFromColumns(shapedColumns).columns,
                transformation_pipeline: []
            };

            setUnifiedConfigJsonString(JSON.stringify(schemaWithMetadata, null, 2));
        }
    };

    const updateColumnsFromManualSchema = () => {
        try {
            const parsed = JSON.parse(unifiedConfigJsonString);
            if (parsed.columns && Array.isArray(parsed.columns)) {
                setColumns(parsed.columns);
            }
            alert("Configuration synced successfully!");
        } catch (e) {
            alert("Invalid JSON format. Please fix the structure before syncing.");
        }
    };

    const addManualRule = (rule: any) => {
        const targetColumn = rule.params.column;
        if (!targetColumn) {
            alert("Please select a column for this rule");
            return;
        }

        const columnExists = columns.some(c => c.name === targetColumn);

        if (!columnExists) {
            // If it's a new field (e.g. from AI or Derived Column), add it
            setColumns(prev => [...prev, {
                name: targetColumn,
                data_type: 'TEXT', // default
                quality_rules: {},
                business_rules: [rule]
            }]);
            return;
        }

        setColumns(prev => prev.map(c => {
            if (c.name === targetColumn) {
                // Special case for Rename
                if (rule.type === 'Rename column' && rule.params.new_name) {
                    return {
                        ...c,
                        name: rule.params.new_name,
                        business_rules: [...(c.business_rules || []), rule]
                    };
                }
                return {
                    ...c,
                    business_rules: [...(c.business_rules || []), rule]
                };
            }
            return c;
        }));
    };

    const removeManualRule = (colName: string, ruleIdx: number) => {
        setColumns(prev => prev.map(c => {
            if (c.name === colName) {
                const refreshedRules = (c.business_rules || []).filter((_: any, i: number) => i !== ruleIdx);
                return { ...c, business_rules: refreshedRules };
            }
            return c;
        }));
    };

    const handleSaveTemplate = async () => {
        if (!templateName || !selectedTargetSourceId || !targetLoadType) {
            alert("Please fill in all required fields (Name, Target System, Entity Configuration)");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: templateName,
                description: templateDescription,
                target_type: selectedTargetType,
                target_source_id: selectedTargetSourceId,
                target_entity_type: targetLoadType,
                target_entity_name: targetEntityName,
                config: {
                    columns,
                    business_rules: {
                        json_source: unifiedConfigJsonString,
                        final_yaml: finalYaml
                    },
                    load_strategy: dataLoadStrategy
                }
            };

            if (editingTemplateId) {
                await updateTransformTemplate(editingTemplateId, payload as any);
                alert("Template updated successfully!");
            } else {
                await createTransformTemplate(payload as any);
                alert("Template saved successfully!");
            }
            // Reset state
            setTemplateName('');
            setTemplateDescription('');
            setSelectedTargetType('');
            setSelectedTargetSourceId(null);
            setTargetLoadType('');
            setTargetEntityName('');
            setColumns([]);
            setEditingTemplateId(null);
            setUnifiedConfigJsonString('{\n  "columns": []\n}');
            setFinalYaml('');
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

                            <button
                                onClick={() => navigate(`/transform/${template.id}`)}
                                className="w-full py-3 bg-white border-2 border-indigo-50 text-indigo-600 font-bold rounded-2xl group-hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
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
                                                                // Direct match on source_type or type
                                                                if (s.source_type === selectedTargetType) return true;
                                                                if (s.type === selectedTargetType) return true;

                                                                // Fuzzy matching
                                                                const type = (s.type || '').toLowerCase();
                                                                if (selectedTargetType === 'RDBMS' && ['postgres', 'mysql', 'mssql', 'oracle', 'sqlite', 'sql', 'database'].some(t => type.includes(t))) return true;
                                                                if (selectedTargetType === 'Flat Files' && ['csv', 'excel', 'json', 'xml', 'parquet', 'file'].some(t => type.includes(t))) return true;
                                                                if (selectedTargetType === 'NO SQL' && ['mongo', 'cassandra', 'redis'].some(t => type.includes(t))) return true;
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
                                                <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Target Endpoint</label>
                                                <div className="relative group">
                                                    <select
                                                        className="w-full p-4 bg-gray-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl transition-all outline-none appearance-none font-bold text-slate-700 cursor-pointer shadow-sm hover:border-emerald-200"
                                                        value={targetLoadType}
                                                        onChange={e => handleLoadTypeChange(e.target.value)}
                                                    >
                                                        <option value="">Select Target Endpoint...</option>
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
                                                                    await hydrateColumnsFromTable(selectedTargetSourceId, tableName);
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
                                                    <div className="mt-4 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Seed Columns From Extractor</label>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const exData = await getExtractors();
                                                                        setExtractors(exData);
                                                                    } catch (err) {
                                                                        console.error("Failed to load extractors", err);
                                                                    }
                                                                }}
                                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                                            >
                                                                Refresh
                                                            </button>
                                                        </div>
                                                        <select
                                                            className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-700"
                                                            value={selectedExtractorId || ''}
                                                            onChange={e => {
                                                                const id = Number(e.target.value);
                                                                setSelectedExtractorId(id);
                                                                hydrateColumnsFromExtractor(id);
                                                            }}
                                                        >
                                                            <option value="">Select extractor...</option>
                                                            {extractors.map(ex => (
                                                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                                                            ))}
                                                        </select>
                                                        <p className="text-xs text-gray-500">If selected, columns & types are pulled from the extractor's schema_info.</p>
                                                    </div>

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
                                            {targetLoadType && (
                                                <div className="mt-6 animate-fade-in pt-6 border-t border-slate-100">
                                                    <label className="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-2">Data Load Strategy</label>
                                                    <div className="relative group">
                                                        <select
                                                            className="w-full p-4 bg-gray-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl transition-all outline-none appearance-none font-bold text-slate-700 cursor-pointer shadow-sm hover:border-emerald-200"
                                                            value={dataLoadStrategy}
                                                            onChange={e => setDataLoadStrategy(e.target.value)}
                                                        >
                                                            <option value="Full Load">Full Load (Truncate & Load)</option>
                                                            <option value="Append Load">Append Load (New Records Only)</option>
                                                            <option value="Incremental Load">Incremental Load (Delta Processing)</option>
                                                            <option value="Upsert / Merge (SCD1)">Upsert / Merge (SCD1)</option>
                                                            <option value="SCD2 (history tracking)">SCD2 (History Tracking)</option>
                                                            <option value="CDC load">CDC Load (Change Data Capture)</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown size={18} />
                                                        </div>
                                                    </div>
                                                    <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase italic leading-relaxed">
                                                        {dataLoadStrategy === 'Full Load' && "• Truncates target table and loads all records fresh."}
                                                        {dataLoadStrategy === 'Append Load' && "• Only loads new records found in source."}
                                                        {dataLoadStrategy === 'Incremental Load' && "• Processes only incremental records based on markers."}
                                                        {dataLoadStrategy === 'Upsert / Merge (SCD1)' && "• Updates existing records or inserts new ones."}
                                                        {dataLoadStrategy === 'SCD2 (history tracking)' && "• Maintains historical versions of changed records."}
                                                        {dataLoadStrategy === 'CDC load' && "• Replicates changes detected via database logs."}
                                                    </p>
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
                                {/* Quality Gates based on JSON schema fields in 'columns', just fallback to length for now since we removed direct column editing */}
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                    <span className="text-xs font-medium text-slate-400">Schema Version:</span>
                                    <span className="font-bold text-emerald-400">v1.0</span>
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

                    <div className="lg:col-span-8 flex flex-col h-full space-y-6">

                        <div className="glass-panel p-8 rounded-[2rem] shadow-xl flex flex-col bg-white border-2 border-slate-100 relative group">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                                        <Settings className="text-indigo-600" size={32} />
                                        Data Quality and Rules Config
                                    </h2>
                                    <p className="text-slate-500 font-medium mt-1">Manage schema definitions and business logic in one place</p>
                                </div>
                                <button
                                    onClick={() => setIsUnifiedModalOpen(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
                                >
                                    <Edit3 size={18} /> Edit Blueprint
                                </button>
                            </div>

                            <div className="flex flex-col gap-6">
                                {/* Single Simplified Box - Extended Length */}
                                <div className="bg-slate-900 rounded-[2rem] p-8 h-[600px] overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all" onClick={() => setIsUnifiedModalOpen(true)}>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Unified Configuration (Schema + Rules)</div>
                                        <Database size={14} className="text-white/20" />
                                    </div>
                                    <div className="w-full h-full pb-20">
                                        <pre className="text-white font-mono text-[10px] opacity-90 leading-relaxed overflow-y-auto h-full custom-scrollbar">{unifiedConfigJsonString}</pre>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none" />
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="px-4 py-2 bg-indigo-50 rounded-xl text-indigo-600 font-bold text-xs">
                                            {columns.length} Fields Configured
                                        </div>
                                        <div className="px-4 py-2 bg-emerald-50 rounded-xl text-emerald-600 font-bold text-xs">
                                            {columns.reduce((acc, col) => acc + (col.business_rules?.length || 0), 0)} Rules Active
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click edit to modify your blueprint</p>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            )}

            {/* Unified Blueprint Modal */}
            <Modal
                title="Data Quality and Rules Configuration"
                isOpen={isUnifiedModalOpen}
                onClose={() => setIsUnifiedModalOpen(false)}
                actions={
                    <>
                        <button
                            onClick={() => {
                                updateColumnsFromManualSchema();
                                setIsUnifiedModalOpen(false);
                            }}
                            className="px-8 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-3 shadow-xl shadow-indigo-200"
                        >
                            <Save size={20} /> Save Configuration
                        </button>
                    </>
                }
            >
                <div className="flex flex-col h-full space-y-8 min-h-[70vh]">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in slide-in-from-right-10 duration-500 pb-10">
                        {/* Left Side: Rule Builder */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-6">
                                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Manual Rule Builder</h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Rule Type</label>
                                        <select
                                            className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all"
                                            value={newRuleType}
                                            onChange={(e) => {
                                                setNewRuleType(e.target.value);
                                                setNewRuleParams({});
                                            }}
                                        >
                                            <option value="">Select a rule...</option>
                                            <option value="Rename column">1. Rename column</option>
                                            <option value="Cast datatype">2. Cast datatype</option>
                                            <option value="Trim / Lowercase / Uppercase">3. Trim / Lowercase / Uppercase</option>
                                            <option value="Replace values">4. Replace values</option>
                                            <option value="Conditional rule (if/else)">5. Conditional rule (if/else)</option>
                                            <option value="Lookup rule (join with master table)">6. Lookup rule (join with master table)</option>
                                            <option value="Derived column">7. Derived column</option>
                                            <option value="Dropping columns">8. Dropping columns</option>
                                            <option value="Custom Business Rules">9. Custom Business Rules</option>
                                        </select>
                                    </div>

                                    {newRuleType && (
                                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Rename Column */}
                                            {newRuleType === 'Rename column' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Source Column</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <textarea
                                                        placeholder="Enter new column name"
                                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-bold h-32 resize-none shadow-inner"
                                                        value={newRuleParams.new_name || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, new_name: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {/* Cast Datatype */}
                                            {newRuleType === 'Cast datatype' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Column</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.target_type || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, target_type: e.target.value })}
                                                    >
                                                        <option value="">Target Type</option>
                                                        <option value="INTEGER">Integer</option>
                                                        <option value="DOUBLE PRECISION">Decimal / Float</option>
                                                        <option value="TEXT">String / Text</option>
                                                        <option value="TIMESTAMP">Date / Time</option>
                                                        <option value="BOOLEAN">Boolean</option>
                                                    </select>
                                                </div>
                                            )}

                                            {newRuleType === 'Trim / Lowercase / Uppercase' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Column</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.operation || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, operation: e.target.value })}
                                                    >
                                                        <option value="">Select Operation</option>
                                                        <option value="trim">Trim</option>
                                                        <option value="lowercase">Lowercase</option>
                                                        <option value="uppercase">Uppercase</option>
                                                    </select>
                                                </div>
                                            )}

                                            {/* Replace Values */}
                                            {newRuleType === 'Replace values' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Column</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Find Value"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.find || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, find: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Replace With"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.replace || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, replace: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {/* Conditional Rule */}
                                            {newRuleType === 'Conditional rule (if/else)' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Column</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Condition (e.g. > 100)"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.condition || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, condition: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Value if True"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.true_val || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, true_val: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Value if False"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.false_val || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, false_val: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {/* Lookup Rule */}
                                            {newRuleType === 'Lookup rule (join with master table)' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Join Key Column</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Master Table Name"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.master_table || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, master_table: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Master Lookup Key"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.master_key || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, master_key: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Fetch Column"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.fetch_col || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, fetch_col: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {/* Derived Column */}
                                            {newRuleType === 'Derived column' && (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="New Column Name"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    />
                                                    <textarea
                                                        placeholder="Expression (e.g. col_a + col_b)"
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold h-20"
                                                        value={newRuleParams.expression || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, expression: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {/* Dropping Columns */}
                                            {newRuleType === 'Dropping columns' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Column to Drop</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Custom Business Rules - AI Powered */}
                                            {newRuleType === 'Custom Business Rules' && (
                                                <div className="space-y-3">
                                                    <select
                                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                                        value={newRuleParams.column || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, column: e.target.value })}
                                                    >
                                                        <option value="">Select Context Column (Optional)</option>
                                                        {columns.map((c, idx) => <option key={`${c.name}-${idx}`} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <textarea
                                                        placeholder="Describe your rule in plain English (e.g. 'If age is > 18 then mark as adult, else minor')"
                                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-bold h-32 resize-none shadow-inner"
                                                        value={newRuleParams.english || ''}
                                                        onChange={e => setNewRuleParams({ ...newRuleParams, english: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            <button
                                                onClick={async () => {
                                                    if (newRuleType === 'Custom Business Rules' && newRuleParams.english) {
                                                        setIsGeneratingRules(true);
                                                        try {
                                                            const aiRules = await generateBusinessRules(newRuleParams.english);
                                                            if (aiRules && Array.isArray(aiRules)) {
                                                                aiRules.forEach((rule: any) => {
                                                                    // Use AI detected column, or fallback to UI selected context column
                                                                    const colToUse = rule.params?.column || newRuleParams.column;
                                                                    if (colToUse) {
                                                                        const finalRule = {
                                                                            ...rule,
                                                                            params: {
                                                                                ...rule.params,
                                                                                column: colToUse
                                                                            }
                                                                        };
                                                                        addManualRule(finalRule);
                                                                    } else {
                                                                        console.warn("AI rule missing column mapping, skipping", rule);
                                                                    }
                                                                });
                                                            }
                                                        } catch (e) {
                                                            console.error("AI Generation failed", e);
                                                            alert("Failed to generate rules from English description.");
                                                        } finally {
                                                            setIsGeneratingRules(false);
                                                        }
                                                    } else {
                                                        addManualRule({ type: newRuleType, params: newRuleParams });
                                                    }
                                                    setNewRuleType('');
                                                    setNewRuleParams({});
                                                }}
                                                disabled={isGeneratingRules || !newRuleType}
                                                className="w-full py-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isGeneratingRules ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        AI Analyzing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={18} /> Add Rule
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 overflow-y-auto max-h-[400px] custom-scrollbar">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Transformation Pipeline</h4>
                                <div className="space-y-2">
                                    {columns.flatMap(col => (col.business_rules || []).map((rule: any, ruleIdx: number) => ({ ...rule, colName: col.name, ruleIdx }))).map((rule, idx) => (
                                        <div key={`${rule.colName}-${rule.ruleIdx}`} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center justify-center w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-800">{rule.type}</p>
                                                    <p className="text-[9px] text-slate-400 font-medium">Column: {rule.colName}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeManualRule(rule.colName, rule.ruleIdx)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Unified Config Editor */}
                        <div className="lg:col-span-8 flex flex-col space-y-4 h-full">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Database size={16} className="text-indigo-600" />
                                    Unified Configuration (JSON)
                                </label>
                                <span className="text-[10px] font-bold text-slate-400 italic">Live editing enabled</span>
                            </div>
                            <textarea
                                className="w-full flex-1 min-h-[500px] p-8 bg-slate-900 text-white font-mono text-sm rounded-[2.5rem] border-none focus:ring-8 focus:ring-indigo-500/10 shadow-2xl custom-scrollbar"
                                value={unifiedConfigJsonString}
                                onChange={(e) => setUnifiedConfigJsonString(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
