import { useState, useRef } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { AudioRecorder } from './components/AudioRecorder';
import { MessageInput } from './components/MessageInput';
import type { Message } from './types';
import { streamAudio, sendText } from './services/api';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'playing'>('idle');
  const audioQueue = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const playNextAudio = async () => {
    if (isPlayingRef.current || audioQueue.current.length === 0) return;

    isPlayingRef.current = true;
    setStatus('playing');

    const audioData = audioQueue.current.shift();
    if (!audioData) {
      isPlayingRef.current = false;
      setStatus('idle');
      return;
    }

    const audio = new Audio("data:audio/mp3;base64," + audioData);
    audio.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };

    try {
      await audio.play();
    } catch (e) {
      console.error("Audio playback error", e);
      isPlayingRef.current = false;
      playNextAudio();
    }
  };

  const handleAudio = async (blob: Blob, duration: number) => {
    setStatus('processing');

    await streamAudio(blob, duration, (data) => {
      if (data.type === 'text') {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'user',
            content: data.user_message
          },
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            isStreaming: true
          }
        ]);
      } else if (data.type === 'audio_chunk') {
        audioQueue.current.push(data.chunk);
        playNextAudio();
      } else if (data.type === 'translation') {
        setMessages(prev => prev.map(m =>
          m.role === 'assistant' && m.isStreaming ? { ...m, translation: data.text } : m
        ));
      } else if (data.type === 'complete') {
        setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
      }
    }, () => {
      if (audioQueue.current.length === 0 && !isPlayingRef.current) {
        setStatus('idle');
      }
    }, (err) => {
      console.error("Audio Stream Error", err);
      setStatus('idle');
      alert("Error processing audio");
    });
  };

  const handleText = async (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setStatus('processing');

    try {
      const res = await sendText(text);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: res.response,
        translation: res.translation,
        audioData: res.audio
      }]);

      if (res.audio) {
        audioQueue.current.push(res.audio);
        playNextAudio();
      }
    } catch (e) {
      console.error("Text Send Error", e);
      alert("Failed to send message");
    } finally {
      if (!isPlayingRef.current && audioQueue.current.length === 0) setStatus('idle');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-white font-sans antialiased overflow-hidden">
      <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-md sticky top-0 z-20 bg-background/80">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status === 'idle' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">Antigravity Tutor</h1>
        </div>
      </header>

      <ChatInterface messages={messages} status={status} />

      <div className="w-full bg-background/95 backdrop-blur border-t border-white/5 pb-safe">
        <MessageInput onSend={handleText} disabled={status !== 'idle'} />
        <AudioRecorder onRecordingComplete={handleAudio} disabled={status !== 'idle'} />
      </div>
    </div>
  );
}

export default App;
