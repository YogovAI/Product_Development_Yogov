import { useState } from 'react';
import { Server, Play, Activity, Settings } from 'lucide-react';

export default function Spark() {
    const [clusters] = useState([
        { name: 'Local Spark', url: 'spark://localhost:7077', status: 'Active', cores: 4, memory: '8 GB' },
        { name: 'VMware Cluster', url: 'spark://192.168.1.5:7077', status: 'Connecting...', cores: '-', memory: '-' },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Spark Clusters</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                    <Server size={20} /> Connect New Cluster
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {clusters.map((cluster, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${cluster.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{cluster.name}</h3>
                                    <p className="text-sm font-mono text-gray-500">{cluster.url}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${cluster.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {cluster.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-xs text-gray-500 block">Total Cores</span>
                                <span className="font-semibold">{cluster.cores}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-xs text-gray-500 block">Total Memory</span>
                                <span className="font-semibold">{cluster.memory}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition flex justify-center items-center gap-2">
                                <Play size={18} /> Submit Job
                            </button>
                            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <Settings size={18} className="text-gray-500" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
