import { TrendingUp, Activity, ArrowUpRight, Database, Server } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function Dashboard() {
    const stats = [
        { name: 'Total Data Sources', value: '12', change: '+2.5%', icon: Database, color: 'text-accent-500 bg-accent-500/10' },
        { name: 'Active Spark Clusters', value: '4', change: '+12%', icon: Server, color: 'text-accent-cyan bg-accent-cyan/10' },
        { name: 'Processed Records', value: '1.2M', change: '+18.2%', icon: Activity, color: 'text-green-600 bg-green-500/10' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
                        Welcome back, <span className="text-gradient">Engineer</span>
                    </h1>
                    <p className="text-gray-500">Here's what's happening in your Data Universe today.</p>
                </div>
                <button className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-accent-500/25">
                    Generate Report
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-lg transition-all border-none">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-3 rounded-xl transition-colors", stat.color)}>
                                    <Icon size={24} />
                                </div>
                                <div className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded-lg">
                                    <TrendingUp size={14} />
                                    {stat.change}
                                </div>
                            </div>
                            <h3 className="text-gray-500 font-medium mb-1">{stat.name}</h3>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                            </div>

                            {/* Decorative accent blob */}
                            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent-500/5 blur-2xl rounded-full group-hover:bg-accent-500/10 transition-all" />
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                    <button className="text-sm text-accent-500 hover:text-accent-600 flex items-center gap-1 font-medium">
                        View All <ArrowUpRight size={16} />
                    </button>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                <Activity size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-gray-900 font-medium">ETL Job #102{item} Completed</h4>
                                <p className="text-sm text-gray-500">Successfully processed 45k records from PostgreSQL</p>
                            </div>
                            <div className="text-sm text-gray-400">2m ago</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
