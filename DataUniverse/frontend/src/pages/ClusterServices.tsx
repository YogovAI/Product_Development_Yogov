import { useState, useEffect } from 'react';
import { Play, Square, Activity, Loader2, Database, Zap, Cpu, Monitor, Power, Server } from 'lucide-react';

interface ServiceStatus {
    name: string;
    description: string;
    icon: any;
    status: 'Running' | 'Stopped' | 'Processing';
    key: 'hadoop' | 'spark' | 'spark-connect';
}

interface NodeStatus {
    id: string;
    name: string;
    type: 'master' | 'worker';
    status: 'Online' | 'Offline' | 'Powering On';
}

export default function ClusterServices() {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Hadoop Eco-system', description: 'Runs start-all.sh on Master node', icon: Database, status: 'Stopped', key: 'hadoop' },
        { name: 'Apache Spark', description: 'Runs start-all.sh from Spark sbin', icon: Zap, status: 'Stopped', key: 'spark' },
        { name: 'Spark Connect', description: 'Remote Connectivity for Spark 3.4+', icon: Cpu, status: 'Stopped', key: 'spark-connect' },
    ]);

    const [nodes, setNodes] = useState<NodeStatus[]>([
        { id: 'master', name: 'Master Node', type: 'master', status: 'Offline' },
        { id: 'worker1', name: 'Worker 1', type: 'worker', status: 'Offline' },
        { id: 'worker2', name: 'Worker 2', type: 'worker', status: 'Offline' },
    ]);

    const [loading, setLoading] = useState<string | null>(null);
    const [nodeLoading, setNodeLoading] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');

    const handleNodePower = async (node: string, action: 'start' | 'stop') => {
        setNodeLoading(node);
        try {
            const response = await fetch(`http://localhost:8002/cluster/power`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ node, action }),
            });
            const data = await response.json();
            setOutput(prev => prev + `\n[VM] ${node} ${action}: ${JSON.stringify(data.results)}`);
            checkStatus();
        } catch (error) {
            setOutput(prev => prev + `\nError: ${error}`);
        } finally {
            setNodeLoading(null);
        }
    };

    const handleAction = async (service: 'hadoop' | 'spark' | 'spark-connect', action: 'start' | 'stop') => {
        setLoading(service);
        try {
            const response = await fetch(`http://localhost:8002/cluster/manage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service, action }),
            });
            const data = await response.json();
            setOutput(prev => prev + `\n[${service}] ${action}: ${data.message}\n${data.output || ''}${data.error || ''}`);
            checkStatus();
        } catch (error) {
            setOutput(prev => prev + `\nError: ${error}`);
        } finally {
            setLoading(null);
        }
    };

    const checkStatus = async () => {
        try {
            const response = await fetch(`http://localhost:8002/cluster/status`);
            const data = await response.json();

            // Update Nodes
            const runningVms = data.running_vms || [];
            setNodes(prev => prev.map(n => ({
                ...n,
                status: runningVms.some((path: string) => path.toLowerCase().includes(n.id)) ? 'Online' : 'Offline'
            })));

            // Update Services
            const jps = data.services || [];
            const isHadoopRunning = jps.some((s: string) => s.includes('NameNode') || s.includes('DataNode') || s.includes('ResourceManager'));
            const isSparkRunning = jps.some((s: string) => s.includes('Master') || s.includes('Worker'));
            const isConnectRunning = jps.some((s: string) => s.includes('SparkConnectServer'));

            setServices(prev => prev.map(s => {
                if (s.key === 'hadoop') return { ...s, status: isHadoopRunning ? 'Running' : 'Stopped' };
                if (s.key === 'spark') return { ...s, status: isSparkRunning ? 'Running' : 'Stopped' };
                if (s.key === 'spark-connect') return { ...s, status: isConnectRunning ? 'Running' : 'Stopped' };
                return s;
            }));
        } catch (error) {
            console.error('Failed to fetch status', error);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

    const renderServiceCard = (service: ServiceStatus) => {
        const Icon = service.icon;
        const isServiceLoading = loading === service.key;
        const isMasterOffline = nodes.find(n => n.id === 'master')?.status === 'Offline';

        return (
            <div key={service.key} className={cn(
                "bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md transition-all duration-300",
                isMasterOffline && "opacity-50 grayscale-[0.5]"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-xl",
                            service.status === 'Running' ? "bg-green-100 text-green-600" : "bg-orange-50 text-orange-400"
                        )}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-citrus-900">{service.name}</h3>
                            <p className="text-xs text-citrus-600/70 uppercase tracking-widest font-semibold">{service.status}</p>
                        </div>
                    </div>
                    <div className={cn(
                        "w-3 h-3 rounded-full animate-pulse",
                        service.status === 'Running' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300"
                    )} />
                </div>

                <p className="text-sm text-citrus-700 mb-8 min-h-[40px]">
                    {service.description}
                </p>

                <div className="flex gap-3">
                    {service.status === 'Stopped' ? (
                        <button
                            onClick={() => handleAction(service.key, 'start')}
                            disabled={isServiceLoading || isMasterOffline}
                            className="flex-1 px-4 py-3 bg-citrus-900 text-white rounded-xl font-bold hover:bg-orange-950 transition-all duration-200 flex justify-center items-center gap-2 shadow-lg shadow-orange-900/20 disabled:opacity-50"
                        >
                            {isServiceLoading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                            Start
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction(service.key, 'stop')}
                            disabled={isServiceLoading}
                            className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all duration-200 flex justify-center items-center gap-2 border border-red-100"
                        >
                            {isServiceLoading ? <Loader2 className="animate-spin" size={20} /> : <Square size={20} />}
                            Stop
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-citrus-950">Cluster Services</h1>
                <p className="text-citrus-700 max-w-2xl">Manage on-prem big data clusters and cloud compute options.</p>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                    <Cpu className="text-accent-500" size={24} />
                    <h2 className="text-2xl font-bold text-citrus-900">On-prem Services (VMware)</h2>
                </div>

                <div className="space-y-8 bg-orange-50/30 p-8 rounded-3xl border border-orange-100 shadow-inner">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-citrus-950">VMware Nodes</h3>
                            <p className="text-xs text-citrus-600">Physical infrastructure status</p>
                        </div>
                        <button
                            onClick={() => handleNodePower('all', 'start')}
                            className="px-4 py-2 bg-white text-accent-500 border border-orange-100 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-accent-500 hover:text-white transition-all shadow-sm"
                        >
                            Power on all
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {nodes.map(node => (
                            <div key={node.id} className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm border border-white">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg", node.status === 'Online' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}>
                                        <Monitor size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-citrus-950">{node.name}</h4>
                                        <span className="text-[10px] font-bold uppercase text-citrus-600/60">{node.status}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleNodePower(node.id, node.status === 'Online' ? 'stop' : 'start')}
                                    disabled={nodeLoading === node.id}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        node.status === 'Online' ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                                    )}
                                >
                                    {nodeLoading === node.id ? <Loader2 size={18} className="animate-spin" /> : <Power size={18} />}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {services.map(renderServiceCard)}
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                    <Zap className="text-accent-500" size={24} />
                    <h2 className="text-2xl font-bold text-citrus-900">Cloud Services</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {['Databricks', 'Snowflake', 'AWS EMR', 'Google Dataproc'].map(cloud => (
                        <div key={cloud} className="bg-white/40 border border-orange-50 p-4 rounded-xl flex items-center gap-3 opacity-60">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                                <Server size={16} />
                            </div>
                            <span className="font-semibold text-sm text-citrus-800">{cloud}</span>
                            <span className="ml-auto text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">SOON</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Console Output Footer */}
            <div className="bg-citrus-950 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-orange-400 font-bold flex items-center gap-2">
                        <Activity size={18} />
                        Cluster Console
                    </h3>
                    <button onClick={() => setOutput('')} className="text-orange-400/50 hover:text-orange-400 text-xs font-medium">Clear Console</button>
                </div>
                <div className="bg-black/40 rounded-xl p-4 h-48 overflow-auto font-mono text-sm text-orange-100/90 border border-white/5 whitespace-pre-wrap">
                    {output || 'System ready. Cluster status updated.'}
                    <div className="animate-pulse inline-block w-2 h-4 bg-orange-400 ml-1 translate-y-0.5" />
                </div>
            </div>
        </div>
    );
}
