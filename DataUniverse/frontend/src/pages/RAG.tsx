import { useState } from 'react';
import { Send, Upload, Bot, User, FileText } from 'lucide-react';

export default function RAG() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I can help you query your documents. Please upload a file to get started.' }
    ]);
    const [input, setInput] = useState('');
    const [files, setFiles] = useState<string[]>([]);

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', content: input }]);
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: `I found some relevant info in your docs: "Analysis of ${input} shows positive trends..."` }]);
        }, 1000);
        setInput('');
    };

    const handleUpload = () => {
        // Mock upload
        setFiles([...files, `document_${files.length + 1}.pdf`]);
        setMessages(prev => [...prev, { role: 'assistant', content: `Processed document_${files.length + 1}.pdf. You can now ask questions about it.` }]);
    };

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">RAG Assistant</h1>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                    {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                                </div>
                                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'assistant' ? 'bg-gray-50 text-gray-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask a question about your documents..."
                                className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            />
                            <button
                                onClick={handleSend}
                                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Files */}
                <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="font-semibold mb-4 text-gray-900">Knowledge Base</h2>
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                        {files.map((file, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                <FileText size={16} className="text-gray-400" />
                                <span className="truncate">{file}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleUpload}
                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
                    >
                        <Upload size={20} />
                        Upload Document
                    </button>
                </div>
            </div>
        </div>
    );
}
