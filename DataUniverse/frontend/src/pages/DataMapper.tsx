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
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Play, Database, ArrowRight, Cloud } from 'lucide-react';
import { getMapperSources, getSourceSchema, createMapping, getETLJobs, executeETLJob, getTemplatesBySource, type SourceSchema, type TransformTemplate } from '../lib/api';
import LoadingOverlay from '../components/LoadingOverlay';
import SuccessPopup from '../components/SuccessPopup';
import LogViewer, { type LogEntry } from '../components/LogViewer';

// Custom Field Node
const FieldNode = ({ data }: { data: { label: string, type: 'source' | 'target', fieldType: string } }) => {
    return (
        <div className={`px-4 py-3 shadow-lg rounded-xl bg-white border-2 ${data.type === 'source' ? 'border-blue-500' : 'border-green-500'} min-w-[180px] hover:shadow-xl transition-all`}>
            <div className="flex items-center justify-between">
                {data.type === 'target' && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500" />}
                <div className="flex-1">
                    <span className="font-semibold text-sm text-gray-800">{data.label}</span>
                    <span className="block text-xs text-gray-500 mt-1">{data.fieldType}</span>
                </div>
                {data.type === 'source' && <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />}
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
    const [jobName, setJobName] = useState('');
    const [sources, setSources] = useState<any[]>([]);
    const [sourceId, setSourceId] = useState<number | null>(null);
    const [targetId, setTargetId] = useState<number | null>(null);
    const [sourceSchema, setSourceSchema] = useState<SourceSchema | null>(null);
    const [targetSchema, setTargetSchema] = useState<SourceSchema | null>(null);
    const [targetIsDatalake, setTargetIsDatalake] = useState(false);
    const [existingJobs, setExistingJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<TransformTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [selectedEngine, setSelectedEngine] = useState<'pandas' | 'spark' | 'dask' | 'seatunnel'>('pandas');
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        loadSources();
        loadExistingJobs();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const addLog = useCallback((message: string, level: LogEntry['level'] = 'info', source: LogEntry['source'] = 'frontend') => {
        setLogs(prev => [...prev.slice(-99), {
            message,
            level,
            source,
            timestamp: new Date().toLocaleTimeString()
        }]);
    }, []);

    const startLogCapture = useCallback(() => {
        setShowLogs(true);
        // Backend logs
        if (eventSourceRef.current) eventSourceRef.current.close();
        eventSourceRef.current = new EventSource('http://localhost:8002/logs/stream');

        eventSourceRef.current.onmessage = (event: MessageEvent) => {
            const message = event.data;
            let level: LogEntry['level'] = 'info';
            if (message.toLowerCase().includes('error')) level = 'error';
            if (message.toLowerCase().includes('success') || message.toLowerCase().includes('completed')) level = 'success';
            if (message.toLowerCase().includes('warning')) level = 'warn';
            addLog(message, level, 'backend');
        };

        eventSourceRef.current.onerror = () => {
            addLog("Lost connection to backend logs", "error", "backend");
            if (eventSourceRef.current) eventSourceRef.current.close();
        };

        // Frontend logs interception
        const originalLog = console.log;
        const originalInfo = console.info;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info', 'frontend');
            originalLog(...args);
        };
        console.info = (...args) => {
            addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info', 'frontend');
            originalInfo(...args);
        };
        console.warn = (...args) => {
            addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'warn', 'frontend');
            originalWarn(...args);
        };
        console.error = (...args) => {
            addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'error', 'frontend');
            originalError(...args);
        };

        return () => {
            console.log = originalLog;
            console.info = originalInfo;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, [addLog]);

    const loadSources = async () => {
        try {
            const data = await getMapperSources();
            setSources(data);
        } catch (error) {
            console.error("Failed to load sources", error);
        }
    };

    const loadExistingJobs = async () => {
        try {
            const jobs = await getETLJobs();
            setExistingJobs(jobs);
        } catch (error) {
            console.error("Failed to load jobs", error);
        }
    };

    const loadSourceSchema = async (id: number, isSource: boolean) => {
        try {
            const schema = await getSourceSchema(id);
            if (isSource) {
                setSourceSchema(schema);
                setSourceId(id);
                // Load templates for this source
                const templates = await getTemplatesBySource(id);
                setAvailableTemplates(templates);
                setSelectedTemplateId(null);
            } else {
                setTargetSchema(schema);
                setTargetId(id);
            }
        } catch (error) {
            console.error("Failed to load schema", error);
        }
    };

    const handleTemplateSelect = (id: number) => {
        setSelectedTemplateId(id);
        const template = availableTemplates.find(t => t.id === id);
        if (template && sourceSchema) {
            // Highlight or update nodes based on template rules if needed
            // For now, we'll just store the selection
            console.log("Applying template rules to mapper:", template);
        }
    };

    const handleTargetSelect = async (id: number) => {
        const target = sources.find(s => s.id === id);
        setTargetIsDatalake(target?.source_type === 'Datalake/Lakehouse');
        loadSourceSchema(id, false);
    };

    useEffect(() => {
        if (sourceSchema && targetSchema) {
            // Create nodes from schemas
            const sourceNodes: Node[] = sourceSchema.fields.map((field, idx) => ({
                id: `s-${idx}`,
                type: 'field',
                position: { x: 50, y: 50 + idx * 80 },
                data: { label: field.name, type: 'source', fieldType: field.type }
            }));

            const targetNodes: Node[] = targetSchema.fields.map((field, idx) => ({
                id: `t-${idx}`,
                type: 'field',
                position: { x: 600, y: 50 + idx * 80 },
                data: { label: field.name, type: 'target', fieldType: field.type }
            }));

            setNodes([...sourceNodes, ...targetNodes]);
            setEdges([]);
        }
    }, [sourceSchema, targetSchema, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        }, eds)),
        [setEdges],
    );

    const handleSaveJob = async () => {
        if (!sourceId || !targetId) {
            alert("Please select both source and target schemas");
            return;
        }

        const mapping = targetIsDatalake ? [] : edges.map(edge => ({
            source: nodes.find(n => n.id === edge.source)?.data.label,
            target: nodes.find(n => n.id === edge.target)?.data.label,
        }));

        try {
            const result = await createMapping({
                name: jobName || 'Untitled Mapping',
                source_id: sourceId,
                target_id: targetId,
                mapping_config: { mappings: mapping }
            });
            alert(`Job "${jobName || 'Untitled'}" saved successfully!`);
            setSelectedJobId(result.id);
            loadExistingJobs();
        } catch (error) {
            alert("Failed to save job: " + error);
        }
    };

    const handleRunJob = async () => {
        if (!selectedJobId) {
            alert("Please save the job first or select an existing job");
            return;
        }

        try {
            setIsLoading(true);
            setLoadingMessage('Executing ETL Job...');

            const stopCapture = startLogCapture();
            console.log("Starting ETL process...");

            const result = await executeETLJob(selectedJobId);

            console.log("ETL Job execution finished successfully.");
            stopCapture();
            setIsLoading(false);
            setSuccessData(result);
            setShowSuccess(true);
        } catch (error: any) {
            console.error(`ETL Job failed: ${error.message}`);
            setIsLoading(false);
            alert("Failed to execute job: " + (error.response?.data?.detail || error.message));
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6 p-6 animate-fade-in">
            {isLoading && <LoadingOverlay message={loadingMessage} progress="Processing data..." />}
            {showSuccess && successData && (
                <SuccessPopup
                    tableName={successData.table_name}
                    rowsInserted={successData.rows_inserted}
                    columns={successData.columns}
                    onClose={() => setShowSuccess(false)}
                />
            )}

            <div className="glass-panel p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-gradient mb-2">Data Mapper</h1>
                        <p className="text-gray-600">Map fields between source and target schemas</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveJob}
                            className="flex items-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                        >
                            <Save size={18} /> Save Job
                        </button>
                        <button
                            onClick={handleRunJob}
                            disabled={!selectedJobId}
                            className={`btn-gradient flex items-center gap-2 px-5 py-3 text-white rounded-xl shadow-lg font-semibold ${!selectedJobId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Play size={18} /> Run Job
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Mapping Job</label>
                        <select
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
                            value={selectedJobId || ''}
                            onChange={(e) => {
                                const jobId = Number(e.target.value);
                                setSelectedJobId(jobId);
                                const job = existingJobs.find(j => j.id === jobId);
                                if (job) {
                                    setJobName(job.name);
                                    setSourceId(job.source_id);
                                    setTargetId(job.target_id);
                                    const target = sources.find(s => s.id === job.target_id);
                                    setTargetIsDatalake(target?.source_type === 'Datalake/Lakehouse');
                                    loadSourceSchema(job.source_id, true);
                                    loadSourceSchema(job.target_id, false);
                                }
                            }}
                        >
                            <option value="">New Mapping</option>
                            {existingJobs.map(job => (
                                <option key={job.id} value={job.id}>{job.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Execution Engine</label>
                        <select
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
                            value={selectedEngine}
                            onChange={(e: any) => setSelectedEngine(e.target.value)}
                        >
                            <option value="pandas">Pandas (Local)</option>
                            <option value="spark">Apache Spark</option>
                            <option value="dask">Dask Cluster</option>
                            <option value="seatunnel">Apache SeaTunnel</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Source</label>
                        <select
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
                            value={sourceId || ''}
                            onChange={(e) => loadSourceSchema(Number(e.target.value), true)}
                        >
                            <option value="">Select Source</option>
                            {sources.map(src => (
                                <option key={src.id} value={src.id}>{src.name} ({src.source_type || src.type})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Apply Template</label>
                        <select
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
                            value={selectedTemplateId || ''}
                            disabled={!sourceId || availableTemplates.length === 0}
                            onChange={(e) => handleTemplateSelect(Number(e.target.value))}
                        >
                            <option value="">{availableTemplates.length > 0 ? 'Select Template' : 'No Templates'}</option>
                            {availableTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Target</label>
                        <select
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
                            value={targetId || ''}
                            onChange={(e) => handleTargetSelect(Number(e.target.value))}
                        >
                            <option value="">Select Target</option>
                            {sources.map(src => (
                                <option key={src.id} value={src.id}>{src.name} ({src.source_type || src.type})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Job Name</label>
                        <input
                            type="text"
                            placeholder="Enter job name"
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            value={jobName}
                            onChange={(e) => setJobName(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 glass-panel rounded-2xl shadow-lg overflow-hidden relative">
                {sourceSchema && targetSchema ? (
                    <>
                        <div className="absolute top-6 left-6 z-10 glass-panel p-3 rounded-xl shadow-md text-sm font-semibold text-indigo-700 flex items-center gap-2">
                            <Database size={16} />
                            Source: {sourceSchema.source_name}
                        </div>
                        <div className="absolute top-6 right-6 z-10 glass-panel p-3 rounded-xl shadow-md text-sm font-semibold text-green-700 flex items-center gap-2">
                            <Database size={16} />
                            Target: {targetSchema.source_name}
                        </div>

                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            fitView
                        >
                            <Background color="#e0e7ff" gap={16} />
                            <Controls />
                        </ReactFlow>
                        {targetIsDatalake && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
                                <div className="glass-panel p-8 rounded-2xl shadow-2xl text-center max-w-md">
                                    <Cloud className="mx-auto mb-4 text-indigo-500" size={48} />
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Datalake Target Selected</h3>
                                    <p className="text-gray-600">
                                        Data will be persisted directly to the Datalake location. Schema mapping is skipped for direct object storage.
                                    </p>
                                    <div className="mt-6 p-3 bg-indigo-50 rounded-xl text-sm font-medium text-indigo-700">
                                        Click "Run Job" to start the transfer
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <ArrowRight className="mx-auto mb-4 text-gray-300" size={64} />
                            <p className="text-lg font-medium text-gray-500">Select source and target schemas to begin mapping</p>
                            <p className="text-sm text-gray-400 mt-2">Choose from the dropdowns above</p>
                        </div>
                    </div>
                )}
            </div>

            {showLogs && (
                <LogViewer
                    logs={logs}
                    onClose={() => {
                        setShowLogs(false);
                        if (eventSourceRef.current) eventSourceRef.current.close();
                    }}
                    onClear={() => setLogs([])}
                />
            )}
        </div>
    );
}
