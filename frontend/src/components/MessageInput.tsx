import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Spanish Tutor..."
                disabled={disabled}
                className="flex-1 bg-transparent border-none text-secondary placeholder-subtle/50 px-3 py-3 focus:ring-0 focus:outline-none focus:border-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none text-base shadow-none !outline-none !ring-0 !border-none !shadow-none"
                autoComplete="off"
            />

            {text.trim() && (
                <button
                    type="submit"
                    disabled={disabled}
                    className="p-1.5 bg-secondary text-background rounded-md hover:bg-white transition-colors disabled:opacity-50"
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            )}
        </form>
    );
};
