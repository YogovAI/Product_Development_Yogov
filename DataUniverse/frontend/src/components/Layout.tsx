import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, ArrowLeftRight, Server, MessageSquare, Filter, Zap, Cpu, ChevronDown, ChevronRight, Cpu as ProcessIcon, Download, Upload, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function Layout() {
    const location = useLocation();
    const [infraOpen, setInfraOpen] = useState(location.pathname.startsWith('/infra'));
    const [transformerOpen, setTransformerOpen] = useState(
        location.pathname === '/transform' ||
        location.pathname === '/mapper'
    );

    const coreNav = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Data Sources', path: '/sources', icon: Database },
        { name: 'Extractor Services', path: '/extractors', icon: Download },
    ];

    const transformerNav = [
        { name: 'Mapper Services', path: '/mapper', icon: ArrowLeftRight },
        { name: 'Transformer Templates', path: '/transform', icon: Wand2 },
    ];

    const extraNav = [
        { name: 'Loader Services', path: '/loaders', icon: Upload },
        { name: 'Spark Jobs', path: '/spark', icon: Server },
        { name: 'Dask Clusters', path: '/dask', icon: Zap },
        { name: 'RAG Assistant', path: '/rag', icon: MessageSquare },
    ];

    const infraNav = [
        { name: 'Database Services', path: '/infra/db', icon: Database },
        { name: 'Datalake Services', path: '/infra/datalake', icon: Server },
        { name: 'Cluster Services', path: '/infra/cluster', icon: Cpu },
        { name: 'Orchestration Services', path: '/infra/orchestration', icon: Zap },
    ];

    return (
        <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden relative selection:bg-indigo-500/30 font-display">
            {/* Sidebar - Dark Professional Theme */}
            <aside className="relative z-10 bg-[#0f172a] flex flex-col h-full w-72 shadow-2xl">
                <Link to="/" className="h-20 flex items-center gap-4 px-8 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
                        <ProcessIcon size={22} className="text-white" />
                    </div>
                    <span className="font-black text-2xl tracking-tighter text-white">DataUniverse</span>
                </Link>

                <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto scrollbar-hide">
                    {coreNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} className={cn(
                                "flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 group relative font-bold text-[15px]",
                                isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}>
                                <Icon size={20} className={cn(isActive ? "text-white" : "group-hover:text-indigo-400 transition-colors")} />
                                <span>{item.name}</span>
                                {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </Link>
                        );
                    })}

                    {/* Transformer Services Dropdown */}
                    <div className="pt-2">
                        <button
                            onClick={() => setTransformerOpen(!transformerOpen)}
                            className={cn(
                                "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 font-bold text-[15px]",
                                transformerOpen ? "text-white bg-slate-800/40" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}
                        >
                            <Filter size={20} className={transformerOpen ? "text-indigo-400" : ""} />
                            <span className="flex-1 text-left">Transformer Services</span>
                            {transformerOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        <div className={cn(
                            "overflow-hidden transition-all duration-500 ease-in-out px-2 space-y-1 mt-1",
                            transformerOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {transformerNav.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive = location.pathname === sub.path;
                                return (
                                    <Link key={sub.path} to={sub.path} className={cn(
                                        "flex items-center gap-3.5 p-3 rounded-xl transition-all duration-200 font-bold text-[13px] ml-4",
                                        isSubActive ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-indigo-300 hover:bg-slate-800/30"
                                    )}>
                                        <SubIcon size={16} />
                                        <span>{sub.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {extraNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path} className={cn(
                                "flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 group relative font-bold text-[15px]",
                                isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}>
                                <Icon size={20} className={cn(isActive ? "text-white" : "group-hover:text-indigo-400 transition-colors")} />
                                <span>{item.name}</span>
                                {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </Link>
                        );
                    })}

                    {/* Infrastructure Dropdown */}
                    <div className="pt-4 mt-4 border-t border-slate-800/50">
                        <button
                            onClick={() => setInfraOpen(!infraOpen)}
                            className={cn(
                                "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 font-bold text-[15px]",
                                infraOpen ? "text-white bg-slate-800/40" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}
                        >
                            <Cpu size={20} className={infraOpen ? "text-indigo-400" : ""} />
                            <span className="flex-1 text-left">Inhouse Infrastructure</span>
                            {infraOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        <div className={cn(
                            "overflow-hidden transition-all duration-500 ease-in-out px-2 space-y-1 mt-1",
                            infraOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {infraNav.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive = location.pathname === sub.path;
                                return (
                                    <Link key={sub.path} to={sub.path} className={cn(
                                        "flex items-center gap-3.5 p-3 rounded-xl transition-all duration-200 font-bold text-[13px] ml-4",
                                        isSubActive ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-indigo-300 hover:bg-slate-800/30"
                                    )}>
                                        <SubIcon size={16} />
                                        <span>{sub.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                <div className="p-6">
                    <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-black p-5 border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-3xl transition-opacity animate-pulse" />
                        <div className="relative z-10 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center text-xs font-black text-indigo-300 border border-indigo-500/20">
                                    AI
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white tracking-tight leading-none mb-1">Eng Engine</div>
                                    <div className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Optimized</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative z-0">
                <div className="p-10 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
