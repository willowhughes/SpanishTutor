class SpanishTutorApp {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isInitialized = false;
        
        // Replace all those booleans with one clear state
        this.appState = 'ready'; // 'ready' | 'recording' | 'processing' | 'playing' | 'disabled'
        
        this.elements = {
            recordBtn: document.getElementById('recordBtn'),
            chatDiv: document.getElementById('chat'),
            input: document.getElementById('input')
        };
        
        this.audioStreamPlayer = new AudioStreamPlayer();
        this.init();
        
        // Streaming control
        this.activeStreamId = 0;       // id of currently "owned" stream
        this.streamCounter = 0;        // monotonic counter
    }
    
    setState(newState) {
        this.appState = newState;
        
        const stateConfig = {
            'mic_request' : { className: 'disabled', text: 'Requesting microphone...' },
            'ready': { className: 'ready', text: 'Hold to Record' },
            'recording': { className: 'recording', text: '🔴 Recording... (Release to stop)' },
            'processing': { className: 'ready', text: '⏹️ Press to interupt...' },
            'playing': { className: 'ready', text: '⏹️ Press to interupt...' },
            'no_mic': { className: 'disabled', text: 'Microphone access denied' }
        };
        
        const config = stateConfig[newState];
        if (config) {
            this.elements.recordBtn.className = config.className;
            this.elements.recordBtn.textContent = config.text;
        }
    }
    
    canRecord() {
        return (this.appState === 'ready' || this.appState === 'playing' || this.appState === 'processing') && this.isInitialized;
    }
    
    async init() {
        this.setupEventListeners();
        await this.initializeAudio();
        this.showWelcomeMessage();
    }
    
    setupEventListeners() {
        // Record button events
        this.elements.recordBtn.addEventListener('mousedown', () => this.startRecording());
        this.elements.recordBtn.addEventListener('mouseup', () => this.stopRecording());
        this.elements.recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.elements.recordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
        this.elements.recordBtn.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Text input
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendTextMessage();
        });
    }
    
    async initializeAudio() {
        if (this.isInitialized) return;
        
        try {
            // Correct state key (was 'mic_req')
            this.setState('mic_request')
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupMediaRecorder(stream);
            
            this.isInitialized = true;
            this.setState('ready')
            
        } catch (error) {
            console.error('Microphone access error:', error);
            this.addMessage('Error: Could not access microphone', 'ai');
            this.setState('no_mic')
        }
    }
    
    setupMediaRecorder(stream) {
        this.mediaRecorder = new MediaRecorder(stream);
        
        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };
        
        this.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            this.audioChunks = [];
            await this.sendAudioMessage(audioBlob);
        };
    }
    
    startRecording() {
        if (!this.canRecord()) return;
        
        // Always invalidate any prior stream when user initiates a new recording (unless already recording)
        // This covers fast sequences where state might have returned to 'ready' between chunks
        if (this.appState !== 'recording') {
            this.activeStreamId = ++this.streamCounter; // new stream id reserved for the *next* outbound request
            console.log(`[Stream ${this.activeStreamId}] User interrupt / new recording started. Invalidated prior streams.`);
            this.audioStreamPlayer.stop();
        }
        
        this.audioChunks = [];
        this.mediaRecorder.start();
        this.setState('recording');
        this.addMessage('Recording... Release button to stop', 'system');
    }
    
    stopRecording() {
        if (this.appState !== 'recording' || !this.mediaRecorder) return;
        
        this.mediaRecorder.stop();
        this.setState('processing');
        this.addMessage('Processing recording...', 'system');
    }
    
    async handleStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Claim a new active stream id for this inbound response (only now that response exists)
        const streamId = ++this.streamCounter;
        this.activeStreamId = streamId;
        console.log(`[Stream ${streamId}] Started streaming response`);
        await this.audioStreamPlayer.initialize();
        
        // Playback completion guarded by stream id so stale completions don't override newer state
        this.audioStreamPlayer.onPlaybackComplete = () => {
            if (this.activeStreamId === streamId) {
                console.log(`[Stream ${streamId}] Playback complete (active). Returning to ready.`);
                this.setState('ready');
            } else {
                console.log(`[Stream ${streamId}] Playback complete (stale, ignored).`);
            }
        };
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (this.activeStreamId !== streamId) {
                            // Stale stream, ignore silently
                            continue;
                        }
                        await this.handleStreamData(data, streamId);
                    } catch (parseError) {
                        console.error('Error parsing SSE data:', parseError);
                    }
                }
            }
        }
        
        // Mark streaming complete only if still current
        if (this.activeStreamId === streamId) {
            this.audioStreamPlayer.finishStreaming();
        } else {
            console.log(`[Stream ${streamId}] Finished receiving (stale, not finalizing playback).`);
        }
    }
    
    async handleStreamData(data, streamId) {
        if (this.activeStreamId !== streamId) return; // stale guard
        switch (data.type) {
            case 'text':
                console.log(`[Stream ${streamId}] Text received.`);
                this.addMessage(`You: ${data.user_message}`, 'user');
                this.addMessage(`AI: ${data.response}`, 'ai');
                break;
            case 'audio_chunk':
                if (this.activeStreamId !== streamId) return; // mid-call stale guard
                if (this.appState === 'processing') {
                    this.setState('playing');
                }
                await this.audioStreamPlayer.playChunk(data.chunk);
                break;
            case 'audio_end':
                console.log(`[Stream ${streamId}] Audio stream declared complete`);
                break;
            case 'translation':
                console.log(`[Stream ${streamId}] Translation received`);
                this.addMessage(`Translation: ${data.text}`, 'translation');
                break;
            case 'complete':
                console.log(`[Stream ${streamId}] Complete signal received`);
                break;
        }
    }
    
    async sendAudioMessage(audioBlob) {
        if (this.appState !== 'processing') return;
        
        try {
            const inputDuration = await AudioUtils.getDuration(audioBlob);
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('input_duration', inputDuration);
            
            const response = await fetch('/chat/audio/stream', {
                method: 'POST',
                body: formData
            });
            
            await this.handleStreamingResponse(response);
            
        } catch (error) {
            console.error('Error sending audio:', error);
            this.addMessage('Error sending audio message', 'ai');
            this.setState('ready');
        }
    }
    
    async sendTextMessage() {
        const message = this.elements.input.value.trim();
        if (!message) return;
        
        this.addMessage(`You: ${message}`, 'user');
        this.elements.input.value = '';
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({message})
            });
            
            const data = await response.json();
            this.addMessage(`AI: ${data.response}`, 'ai');
            
        } catch (error) {
            this.addMessage('Error sending message', 'ai');
        }
    }
    
    updateRecordButton(className, text) {
        this.elements.recordBtn.className = className;
        this.elements.recordBtn.textContent = text;
    }
    
    addMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        this.elements.chatDiv.appendChild(messageDiv);
        this.elements.chatDiv.scrollTop = this.elements.chatDiv.scrollHeight;
    }
    
    showWelcomeMessage() {
        setTimeout(() => {
            this.addMessage('Click "Hold to Record" to start speaking', 'ai');
        }, 500);
    }
}

class AudioStreamPlayer {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.nextPlayTime = 0;
        this.sampleRate = 24000;
        this.isFirstChunk = true;
        this.streamingComplete = false;
        this.onPlaybackComplete = null; // Callback for when audio actually finishes
        this.activeSources = []; // Track active audio sources for interruption
    }
    
    async initialize() {
        // Don't create new AudioContext, just reset timing and state
        this.nextPlayTime = this.audioContext.currentTime;
        this.isFirstChunk = true;
        this.streamingComplete = false;
    }
    
    async playChunk(base64Chunk) {
        try {
            const floatData = AudioUtils.base64ToPCM(base64Chunk);
            
            const audioBufferNode = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
            audioBufferNode.getChannelData(0).set(floatData);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBufferNode;
            source.connect(this.audioContext.destination);
            
            // Track this source for interruption capability
            this.activeSources.push(source);
            
            // Remove from tracking when it ends naturally
            source.onended = () => {
                const index = this.activeSources.indexOf(source);
                if (index > -1) {
                    this.activeSources.splice(index, 1);
                }
            };
            
            const startTime = Math.max(this.nextPlayTime, this.audioContext.currentTime + 0.01);
            source.start(startTime);
            
            this.nextPlayTime = startTime + audioBufferNode.duration;
            
            // Check if this is the last chunk that will play
            this.checkIfPlaybackComplete();
            
            if (this.isFirstChunk) {
                console.log('Started real-time audio streaming!');
                this.isFirstChunk = false;
            }
            
        } catch (error) {
            console.error('Error playing audio chunk:', error);
        }
    }
    
    finishStreaming() {
        console.log('All audio chunks received');
        this.streamingComplete = true;
        this.checkIfPlaybackComplete();
    }
    
    checkIfPlaybackComplete() {
        if (this.streamingComplete) {
            // Schedule callback for when the last audio finishes
            const timeUntilComplete = (this.nextPlayTime - this.audioContext.currentTime) * 1000;
            setTimeout(() => {
                if (this.onPlaybackComplete) {
                    this.onPlaybackComplete();
                }
            }, Math.max(0, timeUntilComplete));
        }
    }
    
    stop() {
        console.log('Stopping audio playback');
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Source might already be stopped, ignore
            }
        });
        this.activeSources = [];
    }
}

class AudioUtils {
    static async getDuration(audioBlob) {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const duration = audioBuffer.duration;
            audioContext.close();
            return duration;
        } catch (error) {
            console.error('Error getting audio duration:', error);
            return 0;
        }
    }
    
    static base64ToPCM(base64Chunk) {
        const binaryString = atob(base64Chunk);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pcmData = new Int16Array(bytes.buffer);
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            floatData[i] = pcmData[i] / 32768.0;
        }
        
        return floatData;
    }
}

// Initialize app when page loads
window.addEventListener('load', () => {
    new SpanishTutorApp();
});
