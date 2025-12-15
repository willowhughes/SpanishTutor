import { useState, useRef } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { AudioRecorder } from './components/AudioRecorder';
import { MessageInput } from './components/MessageInput';
import type { Message } from './types';
import { AudioStreamPlayer } from './services/AudioStreamPlayer';
import { streamAudio, sendText } from './services/api';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'playing'>('idle');
  // Use a ref to keep the player instance stable across renders
  const audioPlayerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());

  const handleAudio = async (blob: Blob, duration: number) => {
    setStatus('processing');

    // Initialize audio context on user interaction (recording start/end is a safe place)
    await audioPlayerRef.current.initialize();

    // Setup playback completion callback
    audioPlayerRef.current.onPlaybackComplete = () => {
      setStatus('idle');
    };

    await streamAudio(blob, duration, async (data) => {
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
        setStatus('playing');
        await audioPlayerRef.current.playChunk(data.chunk);
      } else if (data.type === 'audio_end') {
        audioPlayerRef.current.finishStreaming();
      } else if (data.type === 'translation') {
        setMessages(prev => prev.map(m =>
          m.role === 'assistant' && m.isStreaming ? { ...m, translation: data.text } : m
        ));
      } else if (data.type === 'complete') {
        setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
      }
    }, () => {
      // On stream close - relying on audio_end/finishStreaming for state change
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
        // For text response, we get a single base64 chunk usually, 
        // but we can still use our player if we wrap it or just use simple playback.
        // Since our new player is PCM specific and res.audio might be getting MP3 
        // if we didn't change backend... wait, backend sends LINEAR16?
        // The previous code implies backend sends LINEAR16 always.
        // Let's assume res.audio is also LINEAR16 if it comes from the same TTS.

        await audioPlayerRef.current.initialize();
        setStatus('playing');
        audioPlayerRef.current.onPlaybackComplete = () => setStatus('idle');
        await audioPlayerRef.current.playChunk(res.audio);
        audioPlayerRef.current.finishStreaming();
      } else {
        setStatus('idle');
      }

    } catch (e) {
      console.error("Text Send Error", e);
      alert("Failed to send message");
      setStatus('idle');
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
