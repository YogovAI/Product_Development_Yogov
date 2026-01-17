import { useState, useEffect } from 'react';
import { Server, Zap, Activity, Users, Globe, ExternalLink, Play } from 'lucide-react';
import axios from 'axios';

interface DaskCluster {
    name: string;
    scheduler_address: string;
    status: string;
    workers: number;
}

export default function DaskDashboard() {
    const [clusters, setClusters] = useState<DaskCluster[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchClusters();
    }, []);

    const fetchClusters = async () => {
        try {
            const response = await axios.get('http://localhost:8002/dask/clusters');
            setClusters(response.data);
        } catch (error) {
            console.error("Failed to fetch Dask clusters", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-6 space-y-8 animate-fade-in bg-[#f8fafc]">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        Dask <span className="text-orange-500">Clusters</span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Parallel computing and distributed data processing</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-white border-2 border-orange-100 text-orange-600 font-bold rounded-2xl hover:bg-orange-50 transition-all flex items-center gap-2">
                        <Zap size={18} /> Scale Cluster
                    </button>
                    <button className="px-8 py-3 bg-orange-500 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-600 hover:shadow-orange-200 transition-all">
                        Initialize New
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="glass-panel p-6 rounded-3xl border border-white/50 shadow-xl bg-orange-500 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <Activity size={24} />
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">Real-time</span>
                    </div>
                    <div className="text-4xl font-black mb-1">
                        {clusters.reduce((acc, c) => acc + c.workers, 0)}
                    </div>
                    <div className="text-sm font-bold opacity-80 uppercase tracking-wider">Total Active Workers</div>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-white/50 shadow-xl transition-all hover:scale-[1.02]">
                    <div className="flex justify-between items-center mb-4">
                        <Users className="text-orange-500" size={24} />
                    </div>
                    <div className="text-4xl font-black text-gray-800 mb-1">
                        {clusters.length}
                    </div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Operational Clusters</div>
                </div>

                <div className="glass-panel p-6 rounded-3xl border border-white/50 shadow-xl transition-all hover:scale-[1.02]">
                    <div className="flex justify-between items-center mb-4">
                        <Globe className="text-blue-500" size={24} />
                    </div>
                    <div className="text-4xl font-black text-gray-800 mb-1">99.9%</div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Cluster Uptime</div>
                </div>
            </div>

            <div className="glass-panel rounded-3xl shadow-xl overflow-hidden border border-white/50">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Server className="text-orange-500" size={20} />
                        Active Cluster Resources
                    </h2>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> All Systems Normal
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Cluster Name</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Scheduler Address</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Workers</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {clusters.map((cluster, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-all">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                                <Zap size={18} />
                                            </div>
                                            <span className="font-bold text-gray-800">{cluster.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <code className="px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-600">{cluster.scheduler_address}</code>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className="font-bold text-gray-800">{cluster.workers} Workers</span>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-xl border border-green-100">
                                            {cluster.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-2 text-gray-400 hover:text-blue-600 transition-all hover:bg-blue-50 rounded-lg" title="Open Dashboard">
                                                <ExternalLink size={18} />
                                            </button>
                                            <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all flex items-center gap-2">
                                                <Play size={14} /> Submit Task
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {clusters.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                        No active Dask clusters found. Click "Initialize" to start.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-8 rounded-3xl shadow-xl bg-gray-900 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-4">SeaTunnel Pipeline</h3>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Integration with Apache SeaTunnel allows you to generate high-performance data synchronization jobs using SeaTunnel V2 HOCON configurations.
                        </p>
                        <button className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-orange-600 transition-all">
                            Configure SeaTunnel V2 <Play size={16} fill="white" />
                        </button>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                        <Zap size={200} />
                    </div>
                </div>

                <div className="glass-panel p-8 rounded-3xl shadow-xl flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Cluster Resources Visualization</h3>
                    <p className="text-gray-500 mb-6 italic text-sm">Visualizing CPU and Memory across distributed nodes...</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-400">
                                <span>DISTRIBUTED CPU USAGE</span>
                                <span>34%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-[34%] rounded-full"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-400">
                                <span>DISTRIBUTED MEMORY</span>
                                <span>12.4GB / 32GB</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[42%] rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
