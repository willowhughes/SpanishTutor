import React from 'react';
import { motion } from 'framer-motion';
import { type Message } from '../types';
import { Volume2 } from 'lucide-react';

interface Props {
    message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-lg backdrop-blur-sm ${isUser
                ? 'bg-primary text-white rounded-br-none'
                : 'bg-surface/80 border border-slate-700 text-slate-100 rounded-bl-none'
                }`}>
                <p className="text-lg leading-relaxed">{message.content}</p>

                {!isUser && message.translation && (
                    <div className="mt-2 pt-2 border-t border-slate-600/50">
                        <p className="text-slate-400 text-sm italic">{message.translation}</p>
                    </div>
                )}

                {!isUser && (
                    <div className="mt-1 flex items-center justify-end">
                        {message.isStreaming ? (
                            <span className="text-xs text-primary animate-pulse">Speaking...</span>
                        ) : message.audioData ? (
                            <Volume2 className="w-4 h-4 text-slate-400" />
                        ) : null}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
