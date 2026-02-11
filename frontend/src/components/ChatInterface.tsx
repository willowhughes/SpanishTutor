import React from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../types';

interface Props {
    messages: Message[];
    status: string;
}

export const ChatInterface: React.FC<Props> = ({ messages, status }) => {
    // Scroll logic moved to App.tsx for smart stickiness

    return (
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
            <div className="flex flex-col gap-6">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {status === 'processing' && (
                    <div className="flex justify-start pl-4 opacity-50">
                        <span className="font-serif text-secondary italic">Thinking...</span>
                    </div>
                )}

                <div className="h-4" />
            </div>
        </div>
    );
};
