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

  // Track the current response ID to handle interruptions and ignore stale chunks
  const responseIdRef = useRef<number>(0);

  const handleAudio = async (blob: Blob, duration: number) => {
    // Ignore empty or extremely short/invalid recordings
    if (blob.size < 100) {
      console.log("Ignored audio blob: too small", blob.size);
      // Ensure status gets reset if we were stuck in processing from the start event
      if (status === 'processing') setStatus('idle');
      return;
    }

    setStatus('processing');

    // Generate new response ID for this interaction
    const currentResponseId = Date.now();
    responseIdRef.current = currentResponseId;

    // specific stop call just in case
    audioPlayerRef.current.stop();

    // Initialize audio context on user interaction (recording start/end is a safe place)
    await audioPlayerRef.current.initialize();

    // Setup playback completion callback
    audioPlayerRef.current.onPlaybackComplete = () => {
      // Only update status if this is still the active response
      if (responseIdRef.current === currentResponseId) {
        setStatus('idle');
      }
    };

    await streamAudio(blob, duration, async (data) => {
      // IGNORE chunks if we have moved on to a new response
      if (responseIdRef.current !== currentResponseId) {
        console.log("Ignoring stale chunk from previous response");
        return;
      }

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
    // Generate new response ID
    const currentResponseId = Date.now();
    responseIdRef.current = currentResponseId;

    // Stop any current audio immediately
    audioPlayerRef.current.stop();

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

        // Let's assume res.audio is also LINEAR16 if it comes from the same TTS.
        if (responseIdRef.current !== currentResponseId) return;

        await audioPlayerRef.current.initialize();
        setStatus('playing');
        audioPlayerRef.current.onPlaybackComplete = () => {
          if (responseIdRef.current === currentResponseId) setStatus('idle');
        };
        await audioPlayerRef.current.playChunk(res.audio);
        audioPlayerRef.current.finishStreaming();
      } else {
        if (responseIdRef.current === currentResponseId) setStatus('idle');
      }

    } catch (e) {
      console.error("Text Send Error", e);
      alert("Failed to send message");
      setStatus('idle');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-secondary font-sans antialiased overflow-hidden">

      {/* Centered Area */}
      <div className="flex-1 flex flex-col items-center w-full max-w-3xl mx-auto relative">

        {messages.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-0 pointer-events-none select-none">
            <div className="bg-surface/50 rounded-full px-4 py-1.5 mb-6 text-sm text-subtle border border-white/5 shadow-sm backdrop-blur-sm">
              Spanish Tutor AI
            </div>
            <h1 className="text-5xl font-serif text-secondary mb-4 tracking-tight text-center">
              Hola, Willow
            </h1>
            <p className="text-subtle text-lg font-light text-center max-w-md">
              Ready to practice your Spanish?
            </p>
          </div>
        )}

        {/* Chat Area */}
        <div className={`flex-1 w-full px-4 overflow-y-auto no-scrollbar z-10 masking-gradient ${messages.length === 0 ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
          <div className="h-20"></div> {/* Top Spacer */}
          <ChatInterface messages={messages} status={status} />
          <div className="h-4"></div>
        </div>

        {/* Input Area */}
        {/* Input Area */}
        <div className="w-full px-4 pb-12 z-20 flex flex-col items-center gap-6">

          {/* Main Voice Interaction */}
          <div className="relative">
            <AudioRecorder
              onRecordingComplete={handleAudio}
              onRecordingStart={() => {
                // Stop audio immediately when recording starts (button press)
                audioPlayerRef.current.stop();
                // Invalidate current response so any pending chunks are ignored
                responseIdRef.current = Date.now();
              }}
              disabled={status === 'processing'}
            />
          </div>

          {/* Secondary Text Input */}
          <div className="w-full max-w-lg opacity-50 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
            <div className="bg-surface/50 rounded-full px-1 backdrop-blur-sm">
              <MessageInput onSend={handleText} disabled={status === 'processing'} />
            </div>
          </div>

          {/* Progress Bar for processing (floating top) */}
          {status === 'processing' && (
            <div className="fixed top-0 left-0 w-full h-1 bg-primary/20 z-50">
              <div className="h-full bg-primary animate-progress"></div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;
