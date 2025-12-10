import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../types';

interface Props {
    messages: Message[];
    status: string;
}

export const ChatInterface: React.FC<Props> = ({ messages, status }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, status]);

    return (
        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 overflow-y-auto no-scrollbar">
            <div className="flex flex-col space-y-2">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 opacity-50">
                        <h2 className="text-2xl font-bold text-slate-300">Spanish Tutor AI</h2>
                        <p className="mt-2 text-slate-400">Start speaking to practice your Spanish</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {status === 'processing' && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-surface/50 rounded-2xl p-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-secondary rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
};
