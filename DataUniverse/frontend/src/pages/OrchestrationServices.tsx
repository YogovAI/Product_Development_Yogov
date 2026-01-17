import { useState, useEffect } from 'react';
import { Play, Square, Activity, Loader2, Workflow, Zap } from 'lucide-react';

interface ServiceStatus {
    name: string;
    description: string;
    icon: any;
    status: 'Running' | 'Stopped' | 'Processing';
    key: 'airflow' | 'prefect' | 'mage';
}

export default function OrchestrationServices() {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Apache Airflow', description: 'Enterprise-grade workflow orchestration', icon: Workflow, status: 'Stopped', key: 'airflow' },
        { name: 'Prefect', description: 'Modern orchestration for data stacks', icon: Zap, status: 'Stopped', key: 'prefect' },
        { name: 'Mage AI', description: 'The modern replacement for Airflow', icon: Workflow, status: 'Stopped', key: 'mage' },
    ]);

    const [loading, setLoading] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');

    const handleAction = async (service: 'airflow' | 'prefect' | 'mage', action: 'start' | 'stop') => {
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
                const isRunning = jps.some((sv: string) => sv === `Docker:${s.key}`);
                return { ...s, status: isRunning ? 'Running' : 'Stopped' };
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

                <p className="text-sm text-citrus-700 mb-8 min-h-[40px]">
                    {service.description}
                </p>

                <div className="flex gap-3">
                    {service.status === 'Stopped' ? (
                        <button
                            onClick={() => handleAction(service.key, 'start')}
                            disabled={isServiceLoading}
                            className="flex-1 px-4 py-3 bg-citrus-900 text-white rounded-xl font-bold hover:bg-orange-950 transition-all duration-200 flex justify-center items-center gap-2 shadow-lg shadow-orange-900/20"
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
                <h1 className="text-4xl font-extrabold tracking-tight text-citrus-950">Orchestration Services</h1>
                <p className="text-citrus-700 max-w-2xl">Manage data pipelines and workflow orchestration tools.</p>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                    <Workflow className="text-accent-500" size={24} />
                    <h2 className="text-2xl font-bold text-citrus-900">Inhouse Orchestration</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {services.map(renderServiceCard)}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                    <Zap className="text-accent-500" size={24} />
                    <h2 className="text-2xl font-bold text-citrus-900">Cloud Managed Options</h2>
                    <span className="text-[10px] bg-accent-500 text-white px-2 py-0.5 rounded-full font-bold">SOON</span>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {['MWAA (AWS)', 'Cloud Composer', 'Prefect Cloud', 'Astronomer'].map(cloud => (
                        <div key={cloud} className="bg-white/40 border border-orange-50 p-4 rounded-xl flex items-center gap-3 opacity-60">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                                <Zap size={16} />
                            </div>
                            <span className="font-semibold text-sm text-citrus-800">{cloud}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Console Output Footer */}
            <div className="bg-citrus-950 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-orange-400 font-bold flex items-center gap-2">
                        <Activity size={18} />
                        Orchestration Console
                    </h3>
                    <button onClick={() => setOutput('')} className="text-orange-400/50 hover:text-orange-400 text-xs font-medium">Clear Console</button>
                </div>
                <div className="bg-black/40 rounded-xl p-4 h-48 overflow-auto font-mono text-sm text-orange-100/90 border border-white/5 whitespace-pre-wrap">
                    {output || 'System ready. Orchestration engines status updated.'}
                    <div className="animate-pulse inline-block w-2 h-4 bg-orange-400 ml-1 translate-y-0.5" />
                </div>
            </div>
        </div>
    );
}
