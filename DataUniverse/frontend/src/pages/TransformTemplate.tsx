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
    Wand2,
    FileJson,
    Save
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
    const [businessRulesEnglish, setBusinessRulesEnglish] = useState('');

    // New State for Advanced Configuration
    const [schemaJsonString, setSchemaJsonString] = useState('{\n  "columns": []\n}');
    const [businessRulesJsonString, setBusinessRulesJsonString] = useState('[\n\n]');
    const [finalYaml, setFinalYaml] = useState('');
    const [isGeneratingRules, setIsGeneratingRules] = useState(false);
    const [lastSavedSchema, setLastSavedSchema] = useState<any>(null);

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
            setBusinessRulesEnglish(editTemplate.config?.business_rules?.english || '');
            setBusinessRulesJsonString(editTemplate.config?.business_rules?.json_source || '[\n\n]');
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

    // Live JSON schema preview from current columns - updates the editable text area
    useEffect(() => {
        const schema = buildSchemaFromColumns(columns);
        setSchemaJsonString(JSON.stringify(schema, null, 2));
    }, [columns]);

    // Update Final YAML when Schema or Rules change
    useEffect(() => {
        try {
            const schemaObj = JSON.parse(schemaJsonString);
            let rulesObj = [];
            try {
                rulesObj = JSON.parse(businessRulesJsonString);
            } catch (e) {
                // If rules are invalid JSON, just use empty array or ignore for now
                console.warn("Invalid rules JSON");
            }

            const unified = {
                ...schemaObj,
                business_rules: rulesObj
            };

            const yamlStr = yaml.dump(unified);
            setFinalYaml(yamlStr);
        } catch (e) {
            console.error("Failed to generate YAML", e);
        }
    }, [schemaJsonString, businessRulesJsonString]);

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

    const mapToColumnShape = (field: { name: string; type: string }) => {
        const normalized = (field.type || '').toLowerCase();
        let pg = 'TEXT';
        if (normalized.includes('int')) pg = 'INTEGER';
        else if (normalized.includes('float') || normalized.includes('double')) pg = 'DOUBLE PRECISION';
        else if (normalized.includes('bool')) pg = 'BOOLEAN';
        else if (normalized.includes('time') || normalized.includes('date')) pg = 'TIMESTAMP';
        return {
            name: field.name,
            data_type: field.type,
            quality_rules: { primary_key: false, not_null: false, format: '' },
            business_rules: [],
            constraints: { pg_type: pg, primary_key: false, not_null: false }
        };
    };

    const buildSchemaFromColumns = (cols: any[]) => {
        const schemaCols = (cols || [])
            .filter(c => c)
            .map(c => {
                const name = c.name || c.column_name;
                if (!name) return null;
                const constraints = c.constraints || {};
                const qr = c.quality_rules || {};
                return {
                    name,
                    data_type: c.data_type || c.type,
                    pg_type: constraints.pg_type,
                    primary_key: Boolean(constraints.primary_key || qr.primary_key),
                    not_null: Boolean(constraints.not_null || qr.not_null)
                };
            })
            .filter(Boolean);
        return { columns: schemaCols };
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
                columns: buildSchemaFromColumns(shapedColumns).columns
            };

            setSchemaJsonString(JSON.stringify(schemaWithMetadata, null, 2));
        }
    };

    const updateColumnsFromManualSchema = () => {
        try {
            const schema = JSON.parse(schemaJsonString);
            if (schema && schema.columns) {
                const updatedColumns = schema.columns.map((col: any) => ({
                    name: col.name,
                    data_type: col.data_type,
                    quality_rules: {
                        primary_key: col.primary_key,
                        not_null: col.not_null,
                        format: ''
                    },
                    business_rules: [],
                    constraints: {
                        pg_type: col.pg_type,
                        primary_key: col.primary_key,
                        not_null: col.not_null
                    }
                }));
                setColumns(updatedColumns);
                setLastSavedSchema(schema);
                alert("Schema configuration saved! These columns are now available for rules.");
            } else {
                alert("Invalid schema format: 'columns' array missing.");
            }
        } catch (e) {
            alert("JSON Syntax Error: Please check your schema configuration.");
        }
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
                        english: businessRulesEnglish,
                        json_source: businessRulesJsonString,
                        final_yaml: finalYaml
                    }
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
            setBusinessRulesEnglish('');
            setSchemaJsonString('{\n  "columns": []\n}');
            setBusinessRulesJsonString('[\n\n]');
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

                        <div className="glass-panel p-6 rounded-3xl shadow-xl flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Database className="text-indigo-600" size={20} />
                                    Schema Configuration
                                </h2>
                                <button
                                    onClick={updateColumnsFromManualSchema}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-indigo-500 transition-all flex items-center gap-2"
                                >
                                    <Save size={14} /> Save Schema Configuration
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2 italic">You can rename columns or change types directly in the JSON above. Click Save once done.</p>
                            <div className="relative flex-1">
                                <textarea
                                    className="w-full h-48 p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border-none focus:ring-2 focus:ring-indigo-500 shadow-inner custom-scrollbar"
                                    value={schemaJsonString}
                                    onChange={(e) => setSchemaJsonString(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* 2. Business Rules */}
                        <div className="glass-panel p-6 rounded-3xl shadow-xl flex flex-col">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                                <Wand2 className="text-indigo-600" size={20} />
                                Business Rules Configuration
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* AI Assistant */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                                            AI Assistant (English Input)
                                        </label>
                                        {lastSavedSchema && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100">
                                                <CheckCircle size={10} /> Columns Fetched
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-20 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        {columns.length > 0 ? columns.map(col => (
                                            <span key={col.name} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] font-bold shadow-sm">
                                                {col.name}
                                            </span>
                                        )) : (
                                            <span className="text-[10px] text-slate-400 italic">No columns saved yet...</span>
                                        )}
                                    </div>

                                    <textarea
                                        className="w-full p-4 bg-white border-2 border-indigo-50 rounded-2xl text-sm font-medium focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none resize-none h-32"
                                        placeholder="Describe your rules... (e.g., Make order_id primary key)"
                                        value={businessRulesEnglish}
                                        onChange={(e) => setBusinessRulesEnglish(e.target.value)}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!businessRulesEnglish) return;
                                            setIsGeneratingRules(true);
                                            try {
                                                // Enhance prompt with column context if available
                                                const contextPrompt = columns.length > 0
                                                    ? `Based on existing columns [${columns.map(c => c.name).join(', ')}]: ${businessRulesEnglish}`
                                                    : businessRulesEnglish;

                                                const rules = await generateBusinessRules(contextPrompt);
                                                setBusinessRulesJsonString(JSON.stringify(rules, null, 2));
                                            } catch (error) {
                                                console.error("Failed to generate rules", error);
                                                alert("Failed to generate rules. Please try again.");
                                            } finally {
                                                setIsGeneratingRules(false);
                                            }
                                        }}
                                        disabled={isGeneratingRules || !businessRulesEnglish}
                                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingRules ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processing with AI...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 size={16} /> Fetch Schema & Generate Rules
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* JSON Rules Editor */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                        <span>Rules Specification (JSON)</span>
                                        <span className="text-emerald-500">Editable</span>
                                    </label>
                                    <textarea
                                        className="w-full h-44 p-4 bg-slate-900 text-yellow-300 font-mono text-xs rounded-xl border-none focus:ring-2 focus:ring-indigo-500 shadow-inner custom-scrollbar"
                                        value={businessRulesJsonString}
                                        onChange={(e) => setBusinessRulesJsonString(e.target.value)}
                                        spellCheck={false}
                                        placeholder="[]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Final YAML Preview */}
                        <div className="glass-panel p-6 rounded-3xl shadow-xl flex flex-col flex-1 bg-slate-800 border-slate-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                                <FileJson className="text-emerald-400" size={20} />
                                Final Combined YAML
                            </h2>
                            <p className="text-xs text-slate-400 mb-2">This is the final configuration that will be used by the Mapper Service.</p>
                            <div className="relative flex-1">
                                <textarea
                                    readOnly
                                    className="w-full h-[300px] p-5 bg-slate-950 text-slate-300 font-mono text-xs rounded-2xl border border-slate-700 focus:outline-none custom-scrollbar"
                                    value={finalYaml}
                                />
                                <div className="absolute top-4 right-4">
                                    <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-700">
                                        Read Only
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
