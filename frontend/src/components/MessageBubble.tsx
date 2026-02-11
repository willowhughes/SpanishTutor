import React from 'react';
import type { Message } from '../types';

interface Props {
    message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${isUser
                    ? 'bg-surface/50 text-secondary font-sans'
                    : 'bg-transparent text-secondary font-serif text-lg leading-relaxed'
                }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.translation && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="text-subtle text-sm font-sans italic">
                            {message.translation}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
