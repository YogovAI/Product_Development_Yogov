import { CheckCircle, X, Database } from 'lucide-react';

interface SuccessPopupProps {
    tableName: string;
    rowsInserted: number;
    columns: string[];
    onClose: () => void;
}

export default function SuccessPopup({ tableName, rowsInserted, columns, onClose }: SuccessPopupProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">ETL Job Completed!</h2>
                            <p className="text-sm text-gray-600">Data loaded successfully</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={18} className="text-indigo-600" />
                            <span className="font-semibold text-indigo-900">Table Created</span>
                        </div>
                        <p className="text-lg font-mono text-indigo-700 ml-6">{tableName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <p className="text-sm text-green-700 font-medium mb-1">Rows Inserted</p>
                            <p className="text-2xl font-bold text-green-600">{rowsInserted.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-sm text-blue-700 font-medium mb-1">Columns</p>
                            <p className="text-2xl font-bold text-blue-600">{columns.length}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Column Names:</p>
                        <div className="flex flex-wrap gap-2">
                            {columns.map((col, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-700"
                                >
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 btn-gradient py-3 text-white rounded-xl font-semibold shadow-lg"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
