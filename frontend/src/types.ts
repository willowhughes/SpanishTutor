export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    translation?: string;
    audioData?: string; // Base64 or URL
    isStreaming?: boolean;
}

export interface ChatState {
    messages: Message[];
    status: 'idle' | 'recording' | 'processing' | 'playing';
}
