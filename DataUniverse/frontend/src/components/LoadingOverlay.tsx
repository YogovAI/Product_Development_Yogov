import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    message?: string;
    progress?: string;
}

export default function LoadingOverlay({ message = "Loading...", progress }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full bg-indigo-600/20 animate-pulse"></div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{message}</h3>
                        {progress && (
                            <p className="text-sm text-gray-600">{progress}</p>
                        )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
