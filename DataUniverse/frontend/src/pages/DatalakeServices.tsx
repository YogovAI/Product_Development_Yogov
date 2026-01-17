import { useState, useEffect } from 'react';
import { Play, Square, Activity, Loader2, Server, Zap } from 'lucide-react';

interface ServiceStatus {
    name: string;
    description: string;
    icon: any;
    status: 'Running' | 'Stopped' | 'Processing';
    key: 'minio';
}

export default function DatalakeServices() {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Object Storage', description: 'MinIO for Datalake / Object Storage', icon: Server, status: 'Stopped', key: 'minio' },
    ]);

    const [loading, setLoading] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');

    const handleAction = async (service: 'minio', action: 'start' | 'stop') => {
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
            const jps = data.services || [];

            setServices(prev => prev.map(s => {
                if (s.key === 'minio') {
                    const isRunning = jps.some((sv: string) => sv === 'Docker:minio' || sv === 'Native:minio');
                    return { ...s, status: isRunning ? 'Running' : 'Stopped' };
                }
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

        return (
            <div key={service.key} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", service.status === 'Running' ? "bg-green-100 text-green-600" : "bg-orange-50 text-orange-400")}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-citrus-900">{service.name}</h3>
                            <p className="text-xs text-citrus-600/70 uppercase tracking-widest font-semibold">{service.status}</p>
                        </div>
                    </div>
                    <div className={cn("w-3 h-3 rounded-full animate-pulse", service.status === 'Running' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300")} />
                </div>

                <div className="space-y-4 mb-8">
                    <p className="text-sm text-citrus-700 min-h-[40px]">
                        {service.description}
                    </p>

                    {/* Always show link if running or just started */}
                    {service.status === 'Running' && service.key === 'minio' && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm animate-in zoom-in-95 duration-300">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-2 tracking-widest">System Access</span>
                            <div className="space-y-2">
                                <a
                                    href="http://127.0.0.1:9701"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-2 group"
                                >
                                    <Zap size={14} className="fill-emerald-400 text-emerald-400 group-hover:animate-pulse" />
                                    <span className="underline decoration-citrus-200 underline-offset-4">Open Web Console (Ctrl+Click)</span>
                                </a>
                                <div className="flex gap-4 text-[10px] font-mono text-emerald-600/80 bg-white/50 p-2 rounded-lg border border-emerald-50">
                                    <span>User: <strong className="text-emerald-700">minioadmin</strong></span>
                                    <span>Pass: <strong className="text-emerald-700">minioadmin</strong></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    {service.status === 'Stopped' ? (
                        <button
                            onClick={() => handleAction(service.key, 'start')}
                            disabled={isServiceLoading}
                            className="flex-1 px-4 py-3 bg-emerald-300 text-emerald-900 rounded-xl font-bold hover:bg-emerald-200 transition-all duration-200 flex justify-center items-center gap-2 shadow-lg shadow-emerald-900/10 border-b-4 border-emerald-400 active:border-b-0 active:translate-y-1"
                        >
                            {isServiceLoading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                            Start Service
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction(service.key, 'stop')}
                            disabled={isServiceLoading}
                            className="flex-1 px-4 py-3 bg-rose-400 text-white rounded-xl font-bold hover:bg-rose-500 transition-all duration-200 flex justify-center items-center gap-2 shadow-lg shadow-rose-900/10 border-b-4 border-rose-600 active:border-b-0 active:translate-y-1"
                        >
                            {isServiceLoading ? <Loader2 className="animate-spin" size={20} /> : <Square size={20} />}
                            Stop Service
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-citrus-950">Datalake Services</h1>
                <p className="text-citrus-700 max-w-2xl">Manage on-prem object storage and cloud datalake options.</p>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                    <Server className="text-accent-500" size={24} />
                    <h2 className="text-2xl font-bold text-citrus-900">On-prem Services</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {services.map(renderServiceCard)}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                    <Zap className="text-accent-500" size={24} />
                    <h2 className="text-2xl font-bold text-citrus-900">Cloud Services</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {['AWS S3', 'Azure Blob', 'Google Cloud Storage', 'Wasabi'].map(cloud => (
                        <div key={cloud} className="bg-white/40 border border-orange-50 p-4 rounded-xl flex items-center gap-3 opacity-60">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                                <Zap size={16} />
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
                        Storage Console
                    </h3>
                    <button onClick={() => setOutput('')} className="text-orange-400/50 hover:text-orange-400 text-xs font-medium">Clear Console</button>
                </div>
                <div className="bg-black/40 rounded-xl p-4 h-48 overflow-auto font-mono text-sm text-orange-100/90 border border-white/5 whitespace-pre-wrap">
                    {output || 'System ready. Storage status updated.'}
                    <div className="animate-pulse inline-block w-2 h-4 bg-orange-400 ml-1 translate-y-0.5" />
                </div>
            </div>
        </div>
    );
}
