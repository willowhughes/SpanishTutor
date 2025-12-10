import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
    onSend: (text: string) => void;
    disabled?: boolean;
}

export const MessageInput: React.FC<Props> = ({ onSend, disabled }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSend(text);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-2xl mx-auto w-full flex items-center gap-2">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                disabled={disabled}
                className="flex-1 bg-slate-800/80 backdrop-blur border border-slate-600 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-white placeholder-slate-400 transition-all"
            />
            <button
                type="submit"
                disabled={disabled || !text.trim()}
                className="bg-primary p-3 rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
            >
                <Send className="w-5 h-5 text-white" />
            </button>
        </form>
    );
};
