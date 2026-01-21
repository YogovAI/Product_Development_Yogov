import { useState, useCallback, useEffect, useRef } from 'react';
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
    MarkerType,
    ReactFlowProvider,
    useReactFlow,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database, Zap, Save, CheckCircle, X, Globe, Settings2, ArrowDownCircle, MousePointer2, Plus, ArrowRight, ListFilter, FileText, FileCode, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getExtractors,
    createMapperService,
    getSources,
    getTables,
    getColumns,
    testConnection,
    type SourceSchema,
    type ExtractorService,
    type DataSource
} from '../lib/api';
import LoadingOverlay from '../components/LoadingOverlay';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const Modal = ({ title, isOpen, onClose, children, actions }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight lowercase">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white max-h-[70vh]">
                    {children}
                </div>
                <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm"
                    >
                        <X size={16} /> cancel
                    </button>
                    {actions}
                </div>
            </div>
        </div>
    );
};

// --- Icon Selection Helper ---
const SourceIcon = ({ type, size = 12, className = "" }: { type?: string, size?: number, className?: string }) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('csv') || t.includes('xls') || t.includes('flat')) return <FileText size={size} className={className} />;
    if (t.includes('json') || t.includes('xml')) return <FileCode size={size} className={className} />;
    if (t.includes('datalake') || t.includes('s3') || t.includes('minio')) return <Cloud size={size} className={className} />;
    return <Database size={size} className={className} />;
};

// --- Custom Nodes ---

const SourceCardNode = ({ data }: any) => {
    return (
        <div className="bg-white rounded-full shadow border border-indigo-500 p-0 flex items-center select-none min-w-[120px] h-8">
            <div className="bg-indigo-600 h-full aspect-square flex items-center justify-center rounded-l-full node-drag-handle cursor-move">
                <SourceIcon type={data.iconType} size={12} className="text-white" />
            </div>
            <div className="flex-1 px-2 overflow-hidden">
                <span className="font-bold text-slate-800 text-[9px] lowercase block truncate leading-tight">{data.name}</span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); data.onRemove(data.nodeId); }}
                className="p-1 mx-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
                <X size={10} />
            </button>
            <Handle
                type="source"
                position={Position.Right}
                className="!w-1.5 !h-1.5 !bg-indigo-500 !border-0 !right-[-3px]"
            />
        </div>
    );
};

const TargetCardNode = ({ data }: any) => {
    return (
        <div className="bg-white rounded-full shadow border border-emerald-500 p-0 flex items-center select-none min-w-[120px] h-8">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-1.5 !h-1.5 !bg-emerald-500 !border-0 !left-[-3px]"
            />
            <div className="bg-emerald-600 h-full aspect-square flex items-center justify-center rounded-l-full node-drag-handle cursor-move">
                <Globe size={12} className="text-white" />
            </div>
            <div className="flex-1 px-2 overflow-hidden">
                <span className="font-bold text-slate-800 text-[9px] lowercase block truncate leading-tight">{data.name}</span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); data.onRemove(data.nodeId); }}
                className="p-1 mx-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
                <X size={10} />
            </button>
        </div>
    );
};

const nodeTypes = {
    sourceCard: SourceCardNode,
    targetCard: TargetCardNode,
};

// --- Main Component Wrappers ---

function DataMapperContent() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition, fitView } = useReactFlow();

    // UI Helpers
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Dropdown Data
    const [extractorServices, setExtractorServices] = useState<ExtractorService[]>([]);
    const [sources, setSources] = useState<DataSource[]>([]);

    // Selection States
    const [mapperServiceName, setMapperServiceName] = useState('');
    const [selectedExtractorId, setSelectedExtractorId] = useState<number | null>(null);

    // Manual Target States
    const [selectedTargetType, setSelectedTargetType] = useState<string>('');
    const [selectedTargetSourceId, setSelectedTargetSourceId] = useState<number | null>(null);
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTargetTable, setSelectedTargetTable] = useState<string>('');

    // Modal States
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

    // Target Advanced States
    const [targetEndpointType, setTargetEndpointType] = useState<string>('');
    const [dataLoadStrategy, setDataLoadStrategy] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

    // Configuration States
    const [availableConfigs, setAvailableConfigs] = useState<any[]>([]);
    const [targetSchema, setTargetSchema] = useState<SourceSchema | null>(null);

    // --- APPLY MAPPING SCREEN STATE ---
    const [activeTargetColumns, setActiveTargetColumns] = useState<any[]>([]);
    const [activeSourceFields, setActiveSourceFields] = useState<any[]>([]);
    const [activeTargetFields, setActiveTargetFields] = useState<any[]>([]);
    const [selectedMappingIdx, setSelectedMappingIdx] = useState(0);
    const [activeFunction, setActiveFunction] = useState<string>('');
    const [functionInputVal, setFunctionInputVal] = useState<string>('');


    // Filtered tray: Hide what is already in the workspace
    const visibleConfigs = availableConfigs.filter(config =>
        !nodes.some(node => node.data && node.data.id === config.id)
    );

    // Fetch Initial Data
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setLoadingMessage('fetching configuration...');
            try {
                const [eServices, allSources] = await Promise.all([
                    getExtractors(),
                    getSources()
                ]);
                setExtractorServices(eServices || []);
                setSources(allSources || []);
            } catch (error) {
                console.error("Failed to load initial data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleConfirmSourceConfig = async () => {
        if (!selectedExtractorId) return;
        const extractor = extractorServices.find(e => e.id === selectedExtractorId);
        if (!extractor) return;

        let fields = [];
        if (extractor.schema_info) {
            try {
                const info = typeof extractor.schema_info === 'string'
                    ? JSON.parse(extractor.schema_info)
                    : extractor.schema_info;
                fields = info.fields || info.schema || (Array.isArray(info) ? info : []);
            } catch (e) {
                console.error("Failed to parse schema", e);
            }
        }

        const newConfig = {
            id: `source-${Date.now()}`,
            type: 'source',
            name: extractor.name,
            extractor_id: extractor.id,
            source_id: extractor.source_id,
            fields: fields || [],
            iconType: sources.find(s => s.id === extractor.source_id)?.type || 'database'
        };

        setAvailableConfigs(prev => [...prev, newConfig]);
        setIsSourceModalOpen(false);
        setSelectedExtractorId(null);
    };

    const handleConfirmTargetConfig = async () => {
        if (!selectedTargetSourceId || !selectedTargetTable) return;

        const newConfig = {
            id: `target-${Date.now()}`,
            type: 'target',
            name: selectedTargetTable,
            source_id: selectedTargetSourceId,
            entity_type: targetEndpointType,
            load_strategy: dataLoadStrategy,
            fields: targetSchema?.fields || [],
            iconType: sources.find(s => s.id === selectedTargetSourceId)?.type || 'globe'
        };

        setAvailableConfigs(prev => [...prev, newConfig]);
        setIsTargetModalOpen(false);
        handleTargetTypeChange('');
    };

    const handleTargetTypeChange = (type: string) => {
        setSelectedTargetType(type);
        setSelectedTargetSourceId(null);
        setTables([]);
        setSelectedTargetTable('');
        setTargetSchema(null);
        setConnectionStatus({ status: 'idle', message: '' });
        setTargetEndpointType('');
    };

    const handleTargetSourceChange = async (sourceId: number) => {
        setSelectedTargetSourceId(sourceId);
        setSelectedTargetTable('');
        setTargetSchema(null);
        const source = sources.find(s => s.id === sourceId);
        if (source) {
            const typeLower = (source.type || '').toLowerCase();
            if (['postgres', 'mysql', 'mssql', 'oracle', 'sqlite', 'sql', 'database'].some(t => typeLower.includes(t)) || source.source_type === 'RDBMS') {
                try {
                    setIsLoading(true);
                    setLoadingMessage('fetching tables...');
                    const tableList = await getTables(sourceId);
                    setTables(tableList);
                } catch (error) { console.error(error); } finally { setIsLoading(false); }
            }
        }
    };

    const handleTargetTableChange = async (tableName: string) => {
        setSelectedTargetTable(tableName);
        if (!selectedTargetSourceId || !tableName) return;
        try {
            setIsLoading(true);
            setLoadingMessage('fetching target columns...');
            const cols = await getColumns(selectedTargetSourceId, tableName);
            setTargetSchema({
                source_id: selectedTargetSourceId,
                source_name: tableName,
                fields: cols.map((col: any) => ({ name: col.name || col.column_name, type: col.type || col.data_type || 'string' }))
            });
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        }, eds)),
        [setEdges]
    );

    const onRemoveNode = useCallback((nodeId: string) => {
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    }, [setNodes, setEdges]);

    // Drag and Drop Logic
    const onDragStart = (e: React.DragEvent, config: any) => {
        // We strip symbols like SVG elements before stringifying
        const cleanConfig = { ...config };
        e.dataTransfer.setData('text/plain', JSON.stringify(cleanConfig));
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const dataStr = event.dataTransfer.getData('text/plain');
            if (!dataStr) return;

            try {
                const config = JSON.parse(dataStr);

                // Get rect of the wrapper to ensure we have valid bounds
                const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
                if (!reactFlowBounds) return;

                // Robust position calculation
                const position = screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY,
                });

                const nodeId = `${config.id}_node`;

                const newNode: Node = {
                    id: nodeId,
                    type: config.type === 'source' ? 'sourceCard' : 'targetCard',
                    position,
                    data: {
                        ...config,
                        nodeId: nodeId,
                        onRemove: (id: string) => onRemoveNode(id)
                    },
                    dragHandle: undefined, // allow entire card to be draggable
                };

                setNodes((nds) => [...nds, newNode]);

                // Auto-center the workspace to show the new node
                setTimeout(() => {
                    fitView({ duration: 400, padding: 0.2 });
                }, 50);
            } catch (e) {
                console.error("Drop failed", e);
            }
        },
        [screenToFlowPosition, setNodes, onRemoveNode, fitView]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleOpenMappingScreen = () => {
        const sourceNodes = nodes.filter(n => n.type === 'sourceCard');
        const targetNodes = nodes.filter(n => n.type === 'targetCard');

        if (sourceNodes.length === 0 || targetNodes.length === 0) {
            alert("please ensure both source and target are linked in the workspace.");
            return;
        }

        const sourceData = sourceNodes[0].data;
        const targetData = targetNodes[0].data;

        setActiveSourceFields(sourceData.fields || []);
        setActiveTargetFields(targetData.fields || []);

        // Initialize mappings: try to match by name or just take the first few
        const initialMappings = (targetData.fields && targetData.fields.length > 0)
            ? targetData.fields.map((tf: any) => ({
                source_field: sourceData.fields?.find((sf: any) => sf.name === tf.name)?.name || null,
                name: tf.name,
                type: tf.type
            }))
            : sourceData.fields.map((sf: any) => ({
                source_field: sf.name,
                name: sf.name,
                type: sf.type
            }));

        setActiveTargetColumns(initialMappings);
        setSelectedMappingIdx(0);
        setIsMappingModalOpen(true);
    };

    const handleApplyColumnFunction = (type: string, index: number, value?: any) => {
        const newCols = [...activeTargetColumns];
        if (type === 'rename') {
            newCols[index].name = value;
        } else if (type === 'remove') {
            newCols.splice(index, 1);
            if (selectedMappingIdx >= newCols.length) setSelectedMappingIdx(Math.max(0, newCols.length - 1));
        } else if (type === 'move_up' && index > 0) {
            [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
            setSelectedMappingIdx(index - 1);
        } else if (type === 'move_down' && index < newCols.length - 1) {
            [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
            setSelectedMappingIdx(index + 1);
        } else if (type === 'change_type') {
            newCols[index].type = value;
        }
        setActiveTargetColumns(newCols);
        setActiveFunction(''); // reset function selection
    };


    const handleAddColumn = () => {
        setActiveTargetColumns([...activeTargetColumns, { name: `new_col_${activeTargetColumns.length + 1}`, type: 'string', source_field: null }]);
    };

    const handleSaveMapperService = async () => {
        const sourceNodes = nodes.filter(n => n.type === 'sourceCard');
        const targetNodes = nodes.filter(n => n.type === 'targetCard');

        if (!mapperServiceName) { alert("please enter a mapper service name"); return; }
        if (sourceNodes.length === 0 || targetNodes.length === 0) { alert("please ensure both source and target are in the workspace."); return; }

        const primarySource = sourceNodes[0].data;
        const primaryTarget = targetNodes[0].data;

        // Visual mappings are now implicit or could be derived from activeTargetColumns
        const visualMappings = activeTargetColumns
            .filter(col => col.source_field)
            .map(col => ({
                source: col.source_field,
                target: col.name
            }));

        try {
            setIsLoading(true);
            setLoadingMessage('deploying service...');
            await createMapperService({
                name: mapperServiceName,
                extractor_id: primarySource.extractor_id,
                target_source_id: primaryTarget.source_id,
                target_entity_type: primaryTarget.entity_type,
                target_entity: primaryTarget.name,
                load_strategy: primaryTarget.load_strategy,
                mapping_config: {
                    visual_mappings: visualMappings,
                    transformer_steps: activeTargetColumns.map(col => ({
                        action: 'map',
                        source_column: col.source_field,
                        target_column: col.name,
                        target_type: col.type
                    })),
                    source_metadata: { fields: primarySource.fields },
                    target_metadata: { fields: activeTargetColumns }
                }
            });
            setShowSuccess(true);
            setIsMappingModalOpen(false);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) { console.error(error); alert("mapping deployment failed."); } finally { setIsLoading(false); }
    };
    const handleTestConnection = async () => {
        if (!selectedTargetSourceId) return;
        setConnectionStatus({ status: 'testing', message: 'verifying...' });
        try {
            const res = await testConnection(selectedTargetSourceId);
            if (res.success) setConnectionStatus({ status: 'success', message: 'connection verified!' });
            else setConnectionStatus({ status: 'error', message: res.message });
        } catch (err) { setConnectionStatus({ status: 'error', message: 'handshake failed' }); }
    };

    return (
        <div className="flex flex-col min-h-screen space-y-4 animate-fade-in pb-10 lowercase relative">
            {isLoading && <LoadingOverlay message={loadingMessage} progress="calculating..." />}

            {/* Header Area */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/10 p-2 rounded-xl">
                            <Zap className="text-indigo-600" size={20} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mapper Services</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveMapperService}
                            className="bg-indigo-600 px-8 py-3 text-white rounded-2xl shadow-lg font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Save size={16} /> Save Mapping Template
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
                    <div className="lg:col-span-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest block ml-2">Mapper Service Name</label>
                        <input
                            type="text"
                            placeholder="e.g. sales_data_sync"
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 font-bold text-slate-700 outline-none text-base transition-all"
                            value={mapperServiceName}
                            onChange={(e) => setMapperServiceName(e.target.value)}
                        />
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsSourceModalOpen(true)}
                                className="flex-1 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                            >
                                <Settings2 size={16} /> configure source
                            </button>
                            <button
                                onClick={() => setIsTargetModalOpen(true)}
                                className="flex-1 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                            >
                                <Globe size={16} /> configure target
                            </button>
                        </div>

                        <div className="relative">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest block ml-2">blueprint tray</label>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar min-h-[80px] items-center px-1">
                                <AnimatePresence>
                                    {visibleConfigs.length === 0 ? (
                                        <div className="w-full h-16 flex items-center justify-center border-2 border-slate-100 bg-slate-50/50 rounded-2xl text-slate-300 font-bold italic text-xs">
                                            stage source/target to begin mapping.
                                        </div>
                                    ) : (
                                        visibleConfigs.map((config) => (
                                            <motion.div
                                                key={config.id}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                draggable
                                                onDragStart={(e: any) => onDragStart(e, config)}
                                                className={cn(
                                                    "flex-shrink-0 px-5 py-3 rounded-2xl border-2 shadow-sm cursor-grab active:cursor-grabbing flex items-center gap-2 bg-white transition-all hover:shadow-md",
                                                    config.type === 'source' ? "border-indigo-100 text-indigo-700" : "border-emerald-100 text-emerald-700"
                                                )}
                                            >
                                                <SourceIcon type={config.iconType} size={14} />
                                                <span className="font-bold whitespace-nowrap text-xs">{config.name}</span>
                                                <MousePointer2 size={10} className="opacity-20" />
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Application Workspace */}
            <div className="flex flex-col flex-1 gap-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-2">Mapper Section</label>
                <div
                    ref={reactFlowWrapper}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    className="w-full h-[650px] bg-slate-50/50 rounded-[2.5rem] shadow-inner border border-slate-100 overflow-hidden relative"
                >
                    <button
                        onClick={handleOpenMappingScreen}
                        className="absolute top-6 right-6 z-20 bg-slate-800 px-6 py-2.5 text-white rounded-xl shadow-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/10"
                    >
                        <ListFilter size={14} /> apply mapping
                    </button>
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
                        <Background variant={BackgroundVariant.Lines} color="#f1f5f9" gap={25} size={1} />
                        <Controls className="bg-white border-none shadow-lg rounded-xl m-6" />
                    </ReactFlow>

                    {nodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-[2rem] border border-white/80 shadow-xl max-w-xs">
                                <ArrowDownCircle className="text-slate-300 mx-auto mb-4" size={32} />
                                <h3 className="text-lg font-black text-slate-800 lowercase tracking-tight">Mapper Section</h3>
                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">drop configurations to start</p>
                            </div>
                        </div>
                    )}

                    {showSuccess && (
                        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-white/40 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-white p-10 rounded-[3rem] shadow-2xl border border-emerald-100 flex flex-col items-center gap-4"
                            >
                                <div className="bg-emerald-500 text-white p-4 rounded-full shadow-lg">
                                    <CheckCircle size={48} />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-slate-800 lowercase">deployment active</h2>
                                    <p className="text-slate-500 font-bold mt-2 text-sm lowercase">pipeline is now live.</p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            {/* Config Modals */}
            <Modal isOpen={isSourceModalOpen} onClose={() => setIsSourceModalOpen(false)} title="configure source" actions={<button onClick={handleConfirmSourceConfig} disabled={!selectedExtractorId} className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 disabled:opacity-50">confirm</button>}>
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">active extractor</label>
                    <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 text-sm" value={selectedExtractorId || ''} onChange={(e) => setSelectedExtractorId(Number(e.target.value))}>
                        <option value="">choose extractor...</option>
                        {extractorServices.map(svc => <option key={svc.id} value={svc.id}>{svc.name}</option>)}
                    </select>
                </div>
            </Modal>

            <Modal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} title="configure target" actions={<button onClick={handleConfirmTargetConfig} disabled={!selectedTargetSourceId || !selectedTargetTable} className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-700 disabled:opacity-50">confirm</button>}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <select className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-xs" value={selectedTargetType} onChange={(e) => handleTargetTypeChange(e.target.value)}>
                            <option value="">protocol</option>
                            {['RDBMS', 'Flat Files', 'API', 'Websites Scrap', 'Datalake/Lakehouse', 'NO SQL'].map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <select className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-xs" value={selectedTargetSourceId || ''} onChange={(e) => handleTargetSourceChange(Number(e.target.value))} disabled={!selectedTargetType}>
                            <option value="">instance</option>
                            {sources.filter(s => s.source_type === selectedTargetType || (s.type || '').toLowerCase().includes(selectedTargetType.toLowerCase())).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    {selectedTargetSourceId && <button onClick={handleTestConnection} className="w-full py-3 rounded-lg bg-slate-800 text-white font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all hover:bg-slate-700">test connection {connectionStatus.status === 'success' && <CheckCircle size={12} />}</button>}
                    <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" value={targetEndpointType} onChange={(e) => setTargetEndpointType(e.target.value)}>
                        <option value="">select topology...</option>
                        <option value="single_table">single entity</option>
                        <option value="adhoc">adhoc endpoint</option>
                    </select>
                    {targetEndpointType === 'single_table' && <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" value={selectedTargetTable} onChange={(e) => handleTargetTableChange(e.target.value)}>
                        <option value="">select table...</option>
                        {tables.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>}
                    <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500 text-sm" value={dataLoadStrategy} onChange={(e) => setDataLoadStrategy(e.target.value)}>
                        <option value="">loading strategy...</option>
                        <option value="Full Load">full load</option>
                        <option value="Append">append</option>
                    </select>
                </div>
            </Modal>

            {/* --- APPLY MAPPING SCREEN --- */}
            {isMappingModalOpen && (
                <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300 rounded-[2.5rem] overflow-hidden">
                    <div className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-500 p-2 rounded-xl text-white shadow-lg">
                                <ListFilter size={24} />
                            </div>
                            <div>
                                <h2 className="text-white text-xl font-black lowercase tracking-tight">apply mapping</h2>
                                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">configure schema transformations</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMappingModalOpen(false)}
                                className="px-6 py-2 bg-white/10 text-white rounded-xl font-black uppercase text-[10px] hover:bg-white/20 transition-all"
                            >
                                back to canvas
                            </button>
                            <button
                                onClick={handleSaveMapperService}
                                className="px-8 py-2 bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2"
                            >
                                <Save size={14} /> save mapping
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-start p-6 pt-4 space-y-6">
                        {activeTargetColumns.length > 0 ? (
                            <div className="w-full max-w-4xl space-y-6">
                                <div className="grid grid-cols-2 gap-10 items-stretch relative">
                                    {/* Link Icon */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-indigo-600 p-3 rounded-full shadow-2xl border-4 border-slate-900 group">
                                        <ArrowRight className="text-white group-hover:scale-110 transition-transform" size={18} />
                                    </div>

                                    {/* Left Side: Source Focused Dropdown */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-white/40 tracking-[0.2em] ml-2">source blueprint field</label>
                                        <div className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/10 shadow-inner group hover:border-indigo-500/30 transition-all min-h-[140px] flex flex-col justify-center">
                                            <div className="relative">
                                                <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/50" size={16} />
                                                <select
                                                    className="w-full bg-white/5 border border-white/20 p-3 pl-10 rounded-2xl text-sm font-bold text-white lowercase appearance-none outline-none focus:border-indigo-500 transition-all hover:bg-white/10"
                                                    value={activeTargetColumns[selectedMappingIdx]?.source_field || ''}
                                                    onChange={(e) => {
                                                        const newCols = [...activeTargetColumns];
                                                        newCols[selectedMappingIdx].source_field = e.target.value;
                                                        setActiveTargetColumns(newCols);
                                                    }}
                                                >
                                                    <option value="" className="bg-slate-900">null / no mapping</option>
                                                    {activeSourceFields.map(f => (
                                                        <option key={f.name} value={f.name} className="bg-slate-900">{f.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="mt-4 text-white/20 text-[8px] font-bold text-center uppercase tracking-widest leading-loose">
                                                single source view <br /> active for config
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right Side: Target Mapping & Functions */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-white/40 tracking-[0.2em] ml-2">target configuration</label>
                                        <div className="bg-slate-900/50 p-5 rounded-[2rem] border border-white/10 shadow-inner group hover:border-emerald-500/30 transition-all min-h-[140px] flex flex-col justify-center space-y-3">
                                            {/* Primary: Target Mapping Dropdown */}
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/50" size={16} />
                                                <select
                                                    className="w-full bg-white/5 border border-white/20 p-3 pl-10 rounded-2xl text-sm font-bold text-white lowercase appearance-none outline-none focus:border-emerald-500 transition-all hover:bg-white/10"
                                                    value={activeTargetColumns[selectedMappingIdx]?.name}
                                                    onChange={(e) => handleApplyColumnFunction('rename', selectedMappingIdx, e.target.value)}
                                                >
                                                    <option value={activeTargetColumns[selectedMappingIdx]?.name} className="bg-slate-900">{activeTargetColumns[selectedMappingIdx]?.name} (linked)</option>
                                                    {activeTargetFields.filter(tf => tf.name !== activeTargetColumns[selectedMappingIdx]?.name).map(tf => (
                                                        <option key={tf.name} value={tf.name} className="bg-slate-900">{tf.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Secondary: Functions Dropdown */}
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <Settings2 className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                                                    <select
                                                        className="w-full bg-indigo-500/10 border border-indigo-500/30 p-2.5 pl-10 rounded-xl text-[11px] font-black text-indigo-200 uppercase tracking-widest appearance-none outline-none focus:bg-indigo-500/20"
                                                        value={activeFunction}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setActiveFunction(val);
                                                            if (val === 'rename') setFunctionInputVal(activeTargetColumns[selectedMappingIdx].name);
                                                            else if (val === 'add') setFunctionInputVal(`new_field_${activeTargetColumns.length}`);
                                                            else setFunctionInputVal('');
                                                        }}
                                                    >
                                                        <option value="">column functions...</option>
                                                        <optgroup label="structural" className="bg-slate-900">
                                                            <option value="rename">rename column</option>
                                                            <option value="add">add new column</option>
                                                            <option value="remove">remove mapping</option>
                                                            <option value="change_type">change data type</option>
                                                        </optgroup>
                                                        <optgroup label="sorting" className="bg-slate-900">
                                                            <option value="move_up">move up</option>
                                                            <option value="move_down">move down</option>
                                                        </optgroup>
                                                    </select>
                                                </div>

                                                {/* Subsequent Input/Action Box */}
                                                {activeFunction && (
                                                    <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                                                        {activeFunction === 'rename' || activeFunction === 'add' ? (
                                                            <input
                                                                type="text"
                                                                value={functionInputVal}
                                                                onChange={(e) => setFunctionInputVal(e.target.value)}
                                                                placeholder={activeFunction === 'rename' ? "new name..." : "field name..."}
                                                                className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                                                            />
                                                        ) : activeFunction === 'change_type' ? (
                                                            <select
                                                                className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                                                                value={functionInputVal}
                                                                onChange={(e) => setFunctionInputVal(e.target.value)}
                                                            >
                                                                <option value="">select type...</option>
                                                                {['string', 'integer', 'float', 'boolean', 'timestamp', 'json'].map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div className="flex-1 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl text-[10px] font-bold text-indigo-600 uppercase tracking-tight flex items-center px-4">
                                                                ready to apply {activeFunction.replace('_', ' ')}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (activeFunction === 'rename') {
                                                                    handleApplyColumnFunction('rename', selectedMappingIdx, functionInputVal);
                                                                } else if (activeFunction === 'add') {
                                                                    setActiveTargetColumns([...activeTargetColumns, { name: functionInputVal || 'new_field', type: 'string', source_field: null }]);
                                                                    setSelectedMappingIdx(activeTargetColumns.length);
                                                                    setActiveFunction('');
                                                                } else if (activeFunction === 'change_type') {
                                                                    if (functionInputVal) handleApplyColumnFunction('change_type', selectedMappingIdx, functionInputVal);
                                                                } else {
                                                                    handleApplyColumnFunction(activeFunction, selectedMappingIdx);
                                                                }
                                                                setFunctionInputVal('');
                                                            }}
                                                            className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shrink-0"
                                                        >
                                                            apply
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Selection Bar & Console */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                                        {activeTargetColumns.map((col, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedMappingIdx(idx)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                                                    selectedMappingIdx === idx ? "bg-indigo-500 text-white shadow-lg" : "bg-white/5 text-white/30 hover:bg-white/10"
                                                )}
                                            >
                                                {col.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Generated JSON Console */}
                                    <div className="bg-indigo-50 rounded-3xl border border-indigo-100 p-4 relative group shadow-sm">
                                        <div className="absolute top-3 right-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-200" />
                                            <div className="w-2 h-2 rounded-full bg-indigo-300" />
                                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                        </div>
                                        <label className="text-[7px] font-black uppercase text-indigo-400 tracking-widest block mb-2">generated mapping configuration</label>
                                        <pre className="text-[10px] font-mono text-slate-700 leading-relaxed overflow-auto max-h-[120px] scrollbar-hide py-2">
                                            {JSON.stringify({
                                                visual_mappings: activeTargetColumns.filter(c => c.source_field).map(c => ({ source: c.source_field, target: c.name })),
                                                transformer_steps: activeTargetColumns.map(c => ({ action: 'map', ...c }))
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6">
                                <div className="bg-white/5 p-8 rounded-full">
                                    <Plus size={48} className="text-white/10" />
                                </div>
                                <button
                                    onClick={handleAddColumn}
                                    className="px-10 py-4 bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    create first mapping
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DataMapper() {
    return (
        <ReactFlowProvider>
            <DataMapperContent />
        </ReactFlowProvider>
    );
}
