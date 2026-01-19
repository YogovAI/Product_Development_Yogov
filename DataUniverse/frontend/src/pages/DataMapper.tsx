import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    type Connection,
    type Node,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database, ArrowRight, Zap, Info, Save, CheckCircle } from 'lucide-react';
import {
    getSourceSchema,
    getExtractors,
    getTransformTemplates,
    createMapperService,
    type SourceSchema,
    type TransformTemplate,
    type ExtractorService
} from '../lib/api';
import LoadingOverlay from '../components/LoadingOverlay';

// Custom Field Node for Mapping Visualization
const FieldNode = ({ data }: { data: { label: string, type: 'source' | 'target', fieldType: string } }) => {
    return (
        <div className={`px-5 py-4 shadow-xl rounded-2xl bg-white border-2 ${data.type === 'source' ? 'border-indigo-500 shadow-indigo-100' : 'border-emerald-500 shadow-emerald-100'} min-w-[200px] hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center justify-between">
                {data.type === 'target' && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-white" />}
                <div className="flex-1">
                    <span className="font-bold text-[14px] text-slate-800 tracking-tight">{data.label}</span>
                    <span className="block text-[11px] font-black uppercase text-slate-400 mt-1.5 tracking-widest">{data.fieldType}</span>
                </div>
                {data.type === 'source' && <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-white" />}
            </div>
        </div>
    );
};

const nodeTypes = {
    field: FieldNode,
};

export default function DataMapper() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Dropdown Data
    const [extractorServices, setExtractorServices] = useState<ExtractorService[]>([]);
    const [templates, setTemplates] = useState<TransformTemplate[]>([]);

    // Selection States
    const [mapperServiceName, setMapperServiceName] = useState('');
    const [selectedExtractorId, setSelectedExtractorId] = useState<number | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

    // Schema States
    const [sourceSchema, setSourceSchema] = useState<SourceSchema | null>(null);
    const [targetSchema, setTargetSchema] = useState<SourceSchema | null>(null);

    // UI Helpers
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Fetch All Dropdown Data on Mount
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setLoadingMessage('Fetching Configuration...');
            try {
                const [eServices, allTemplates] = await Promise.all([
                    getExtractors(),
                    getTransformTemplates()
                ]);
                setExtractorServices(eServices || []);
                setTemplates(allTemplates || []);
            } catch (error) {
                console.error("Failed to load initial data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Handle Extractor Selection -> Load Physical Source Schema
    const handleExtractorChange = async (id: number) => {
        const extractorId = Number(id);
        setSelectedExtractorId(extractorId);
        const extractor = extractorServices.find(e => e.id === extractorId);

        if (!extractor) {
            setSourceSchema(null);
            return;
        }

        // Use schema_info from the extractor if available
        if (extractor.schema_info) {
            let fields = [];
            try {
                const info = typeof extractor.schema_info === 'string'
                    ? JSON.parse(extractor.schema_info)
                    : extractor.schema_info;

                fields = info.fields || info.schema || [];
                // If the info is just the array itself
                if (Array.isArray(info)) fields = info;
            } catch (e) {
                console.error("Failed to parse extractor schema_info", e);
            }

            if (fields.length > 0) {
                setSourceSchema({
                    source_id: extractor.source_id,
                    source_name: extractor.name,
                    fields: fields
                });
                return;
            }
        }

        try {
            setIsLoading(true);
            setLoadingMessage('Introspecting Extractor Schema...');
            const schema = await getSourceSchema(extractor.source_id);
            setSourceSchema(schema);
        } catch (error) {
            console.error("Failed to load schema", error);
            setSourceSchema(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Template Selection -> Derive Target Schema from Template JSON fields
    const handleTemplateChange = (id: number) => {
        const templateId = Number(id);
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);

        if (!template || !template.config || !template.config.columns) {
            console.warn("Template missing configuration or columns", template);
            setTargetSchema(null);
            return;
        }

        const derivedTargetSchema: SourceSchema = {
            source_id: -1,
            source_name: template.name,
            fields: template.config.columns.map(col => ({
                name: col.name,
                type: col.data_type || 'string'
            }))
        };
        setTargetSchema(derivedTargetSchema);
    };

    // Flow Connection Handler
    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        }, eds)),
        [setEdges],
    );

    // Sync Nodes Array with State Changes
    useEffect(() => {
        const newNodes: Node[] = [];

        if (sourceSchema) {
            const sourceNodes: Node[] = sourceSchema.fields.map((field, idx) => ({
                id: `s-${field.name}`,
                type: 'field',
                position: { x: 50, y: 50 + idx * 100 },
                data: { label: field.name, type: 'source', fieldType: field.type }
            }));
            newNodes.push(...sourceNodes);
        }

        if (targetSchema) {
            const targetNodes: Node[] = targetSchema.fields.map((field, idx) => ({
                id: `t-${field.name}`,
                type: 'field',
                position: { x: 700, y: 50 + idx * 100 },
                data: { label: field.name, type: 'target', fieldType: field.type }
            }));
            newNodes.push(...targetNodes);
        }

        setNodes(newNodes);
        setEdges([]); // Reset mappings when input/output definitions change
    }, [sourceSchema, targetSchema, setNodes, setEdges]);

    // Save Mapper Service to Postgres DB
    const handleSaveMapperService = async () => {
        if (!mapperServiceName) {
            alert("Please enter a Mapper Service Name");
            return;
        }
        if (!selectedExtractorId || !selectedTemplateId) {
            alert("Please select both an Extractor Service and a Transformer Template");
            return;
        }

        const extractor = extractorServices.find(e => e.id === selectedExtractorId);
        const template = templates.find(t => t.id === selectedTemplateId);

        if (!extractor || !template) return;

        // Prepare the mapping config from edges
        const columnMappings = edges.map(edge => ({
            source: nodes.find(n => n.id === edge.source)?.data.label,
            target: nodes.find(n => n.id === edge.target)?.data.label,
        }));

        try {
            setIsLoading(true);
            setLoadingMessage('Saving Mapper Service...');

            await createMapperService({
                name: mapperServiceName,
                extractor_id: extractor.id,
                template_id: template.id,
                mapping_config: {
                    mappings: columnMappings
                }
            });

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save mapper service", error);
            alert("Failed to save Mapper Service. Ensure all requirements are met.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] space-y-8 animate-fade-in">
            {isLoading && <LoadingOverlay message={loadingMessage} progress="Working..." />}

            {/* Control Panel */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                            Mapper Services
                            <div className="bg-indigo-500/10 p-2 rounded-xl">
                                <Zap className="text-indigo-600" size={24} />
                            </div>
                        </h1>
                        <p className="text-slate-500 font-medium mt-2">Connect Extractor columns to Transformer target columns</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleSaveMapperService}
                            className="btn-gradient flex items-center gap-2 px-8 py-4 text-white rounded-2xl shadow-lg shadow-indigo-500/20 font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all"
                        >
                            <Save size={18} /> Save Mapper Service
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Mapper Service Name - Free Text Box */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 mb-2.5 tracking-[0.15em] ml-1">
                            <Info size={14} /> Mapper Service Name
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Service Name (e.g. SalesDataMapper)"
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 shadow-sm"
                            value={mapperServiceName}
                            onChange={(e) => setMapperServiceName(e.target.value)}
                        />
                    </div>

                    {/* Extractor Service Selector */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 mb-2.5 tracking-[0.15em] ml-1">
                            <Database size={14} /> Extractor Service
                        </label>
                        <select
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                            value={selectedExtractorId || ''}
                            onChange={(e) => handleExtractorChange(Number(e.target.value))}
                        >
                            <option value="">Select Extractor</option>
                            {extractorServices.map(svc => (
                                <option key={svc.id} value={svc.id}>{svc.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Transformer Template Selector */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 mb-2.5 tracking-[0.15em] ml-1">
                            <Zap size={14} /> Transformer Template
                        </label>
                        <select
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-[1.25rem] focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                            value={selectedTemplateId || ''}
                            onChange={(e) => handleTemplateChange(Number(e.target.value))}
                            disabled={!selectedExtractorId}
                        >
                            <option value="">Apply Schema Template</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Mapping Workspace */}
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-slate-100 overflow-hidden relative min-h-[500px]">
                {showSuccess && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-8 rounded-[3rem] shadow-2xl border border-emerald-100 flex flex-col items-center gap-4 animate-bounce">
                        <CheckCircle className="text-emerald-500" size={64} />
                        <h2 className="text-2xl font-black text-slate-800">Mapper Service Saved!</h2>
                    </div>
                )}

                {(sourceSchema || targetSchema) ? (
                    <>
                        <div className="absolute top-10 left-10 z-10 bg-white/80 backdrop-blur-xl p-4 px-6 rounded-2xl shadow-xl border border-indigo-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                <Database size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 leading-none mb-1">Source Schema (Extractor)</span>
                                <span className="text-sm font-bold text-slate-800">{sourceSchema?.source_name || "N/A"}</span>
                            </div>
                        </div>

                        <div className="absolute top-10 right-10 z-10 bg-white/80 backdrop-blur-xl p-4 px-6 rounded-2xl shadow-xl border border-emerald-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                <Zap size={16} />
                            </div>
                            <div>
                                <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 leading-none mb-1">Target Schema (Template)</span>
                                <span className="text-sm font-bold text-slate-800">{targetSchema?.source_name || "N/A"}</span>
                            </div>
                        </div>

                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                        >
                            <Background color="#f1f5f9" gap={20} size={1} />
                            <Controls className="bg-white border-none shadow-xl rounded-xl overflow-hidden" />
                        </ReactFlow>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full bg-slate-50/50">
                        <div className="text-center max-w-sm px-8">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
                                <ArrowRight className="text-slate-300" size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Workspace Empty</h3>
                            <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                {!selectedExtractorId ? "Select an Extractor Service to load source columns." :
                                    "Select a Transformer Template to define your target columns."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
