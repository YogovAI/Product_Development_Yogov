import { useState, useEffect, useMemo } from 'react';
import { Plus, Database, FileText, Server, Cloud, Globe, Link, Package, Search, ChevronLeft, ChevronRight, Filter as FilterIcon, Settings, Trash2, ExternalLink, List as ListIcon, Grid as GridIcon, Clock } from 'lucide-react';
import { getSources, createSource, updateSource, deleteSource, type DataSource } from '../lib/api';

const SOURCE_TYPES = [
    'RDBMS',
    'NO SQL',
    'Flat Files',
    'Datalake/Lakehouse',
    'API',
    'Websites Scrap',
    'External File Format',
    'External_Sources'
];

interface SourceConfig {
    [key: string]: string;
}

const ITEMS_PER_PAGE = 15;

export default function Sources() {
    const [sources, setSources] = useState<DataSource[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [newSource, setNewSource] = useState({
        name: '',
        source_type: 'RDBMS',
        type: 'database',
        connection_details: {} as SourceConfig
    });

    useEffect(() => {
        loadSources();
    }, []);

    const loadSources = async () => {
        try {
            const data = await getSources();
            setSources(data);
        } catch (error) {
            console.error("Failed to load sources", error);
        }
    };

    const filteredSources = useMemo(() => {
        return sources.filter(source => {
            const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (source.source_type && source.source_type.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesType = selectedType === 'All' || source.source_type === selectedType;
            return matchesSearch && matchesType;
        });
    }, [sources, searchQuery, selectedType]);

    const totalPages = Math.ceil(filteredSources.length / ITEMS_PER_PAGE);
    const paginatedSources = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSources.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredSources, currentPage]);

    // Reset page when filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedType]);

    const getConfigFields = (sourceType: string): string[] => {
        switch (sourceType) {
            case 'RDBMS':
            case 'NO SQL':
                return ['User Name', 'User Password', 'Host or IP Address', 'Port', 'DB Name or Service Name'];
            case 'Flat Files':
                return ['Source File Type', 'Source File Name', 'Source File Path'];
            case 'Datalake/Lakehouse':
                return ['Datalake Name', 'Access Key', 'Secret Key', 'Endpoint URL', 'Datalake Location'];
            case 'API':
                return ['API URL', 'Credentials if any'];
            case 'Websites Scrap':
                return ['Website Link'];
            case 'External File Format':
                return ['External File Format', 'External File Format Link'];
            case 'External_Sources':
                return ['External Source Details'];
            default:
                return [];
        }
    };

    const handleSourceTypeChange = (sourceType: string) => {
        let type = 'database';
        if (sourceType === 'Flat Files') type = 'file';
        if (sourceType === 'Datalake/Lakehouse') type = 'datalake';
        if (sourceType === 'API') type = 'api';

        setNewSource({
            ...newSource,
            source_type: sourceType,
            type: type,
            connection_details: {}
        });
    };

    const handleConfigChange = (field: string, value: string) => {
        setNewSource({
            ...newSource,
            connection_details: {
                ...newSource.connection_details,
                [field]: value
            }
        });
    };

    const handleEdit = (source: DataSource) => {
        setEditingSourceId(source.id);
        setNewSource({
            name: source.name,
            source_type: source.source_type || 'RDBMS',
            type: source.type || 'database',
            connection_details: source.connection_details || {}
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSourceId) {
                await updateSource(editingSourceId, newSource);
            } else {
                await createSource(newSource);
            }
            setIsModalOpen(false);
            setEditingSourceId(null);
            setNewSource({
                name: '',
                source_type: 'RDBMS',
                type: 'database',
                connection_details: {}
            });
            loadSources();
        } catch (error) {
            alert("Error processing source: " + error);
        }
    };

    const handleDeleteSource = async (id: number) => {
        if (!confirm('Are you sure you want to delete this data source?')) return;
        try {
            await deleteSource(id);
            loadSources();
        } catch (error) {
            alert("Error deleting source: " + error);
        }
    };

    const getIcon = (type: string) => {
        if (type === 'RDBMS' || type === 'NO SQL') return Database;
        if (type === 'Flat Files') return FileText;
        if (type === 'Datalake/Lakehouse') return Cloud;
        if (type === 'API') return Link;
        if (type === 'Websites Scrap') return Globe;
        if (type === 'External File Format') return Package;
        return Server;
    };

    const configFields = getConfigFields(newSource.source_type);

    return (
        <div className="space-y-6 p-6 animate-fade-in max-w-[1700px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
                        Data <span className="text-indigo-600">Sources</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">Manage and explore your universe of data connections</p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-4">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <GridIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ListIcon size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingSourceId(null);
                            setNewSource({
                                name: '',
                                source_type: 'RDBMS',
                                type: 'database',
                                connection_details: {}
                            });
                            setIsModalOpen(true);
                        }}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        Create Data Source
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12 lg:col-span-8 relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by source name or type..."
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="md:col-span-12 lg:col-span-4 relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <FilterIcon size={20} />
                    </div>
                    <select
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* View Rendering */}
            {viewMode === 'grid' ? (
                <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {paginatedSources.map((source) => {
                        const Icon = getIcon(source.source_type || source.type);
                        return (
                            <div key={source.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="p-4 bg-slate-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-inner">
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(source)}
                                                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSource(source.id)}
                                                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="font-black text-xl text-slate-800 tracking-tight group-hover:text-indigo-700 transition-colors truncate">{source.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70">{source.source_type || source.type}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-100 group-hover:bg-white transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Config</span>
                                            <Settings size={12} className="text-slate-300" />
                                        </div>
                                        <div className="space-y-1 max-h-24 overflow-hidden relative">
                                            {Object.entries(source.connection_details || {}).slice(0, 2).map(([key, val]) => (
                                                <div key={key} className="flex justify-between text-[11px]">
                                                    <span className="text-slate-400 font-bold">{key}</span>
                                                    <span className="text-slate-700 font-mono truncate max-w-[100px]">
                                                        {key.toLowerCase().includes('password') ? '••••' : String(val)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data Source Name</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Connection</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedSources.map((source) => {
                                const Icon = getIcon(source.source_type || source.type);
                                return (
                                    <tr key={source.id} className="hover:bg-indigo-50/20 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tight">Active</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{source.name}</p>
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Clock size={10} />
                                                        <span className="text-[10px] font-bold">{new Date(source.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                                                {source.source_type || source.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex gap-3">
                                                {Object.entries(source.connection_details || {}).slice(0, 3).map(([key, val]) => (
                                                    <div key={key} className="flex flex-col">
                                                        <span className="text-[9px] uppercase font-black text-slate-300 tracking-tighter">{key}</span>
                                                        <span className="text-[11px] font-bold text-slate-600 truncate max-w-[90px]">
                                                            {key.toLowerCase().includes('password') ? '••••' : String(val)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(source)}
                                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-100 transition-all"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSource(source.id)}
                                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-rose-600 border border-transparent hover:border-slate-100 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {filteredSources.length === 0 && (
                <div className="bg-white rounded-[3rem] border border-slate-100 p-24 text-center">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Database className="text-slate-300" size={64} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">No connection found</h2>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">
                        Your search didn't match any data sources. Try adjusting your keywords or clearing the filter.
                    </p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedType('All'); }}
                        className="mt-8 text-indigo-600 font-black flex items-center gap-2 mx-auto hover:gap-3 transition-all"
                    >
                        Clear all filters <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Advanced Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-bold">
                        Showing <span className="text-slate-900 font-black">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 font-black">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSources.length)}</span> of <span className="text-slate-900 font-black">{filteredSources.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                // Simple logic to show current, first, last, and a few around
                                if (
                                    pageNum === 1 ||
                                    pageNum === totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentPage === pageNum
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                                : 'text-slate-400 hover:text-slate-900'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                }
                                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return <span key={pageNum} className="text-slate-300 px-1 font-bold">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal - Kept standard but improved spacing */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                        <h2 className="text-3xl font-black mb-8 text-slate-800 tracking-tight">
                            {editingSourceId ? 'Update Data Point' : 'Create Data Source'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-400">Data Source Name</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold text-slate-700"
                                    value={newSource.name}
                                    onChange={e => setNewSource({ ...newSource, name: e.target.value })}
                                    placeholder="e.g. Master Production DB"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-400">Source Type</label>
                                <select
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-black text-slate-700 appearance-none cursor-pointer"
                                    value={newSource.source_type}
                                    onChange={e => handleSourceTypeChange(e.target.value)}
                                >
                                    {SOURCE_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Server size={18} className="text-indigo-600" />
                                    Connection Parameters
                                </h3>
                                <div className="space-y-5">
                                    {configFields.map((field) => (
                                        <div key={field}>
                                            <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-400">
                                                {field}
                                            </label>
                                            <input
                                                type={field.toLowerCase().includes('password') ? 'password' : 'text'}
                                                className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none font-bold text-slate-700"
                                                value={newSource.connection_details[field] || ''}
                                                onChange={e => handleConfigChange(field, e.target.value)}
                                                placeholder={`Enter ${field.toLowerCase()}`}
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-10">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {editingSourceId ? 'Apply Changes' : 'Create Access Point'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

