class SpanishTutorApp {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isInitialized = false;
        this.isButtonPressed = false;
        
        this.elements = {
            recordBtn: document.getElementById('recordBtn'),
            chatDiv: document.getElementById('chat'),
            input: document.getElementById('input')
        };
        
        this.audioStreamPlayer = new AudioStreamPlayer();
        this.init();
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
            this.updateRecordButton('disabled', 'Requesting microphone...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupMediaRecorder(stream);
            
            this.isInitialized = true;
            this.updateRecordButton('ready', 'Hold to Record');
            
            if (this.isButtonPressed) {
                this.startRecording();
            }
            
        } catch (error) {
            console.error('Microphone access error:', error);
            this.addMessage('Error: Could not access microphone', 'ai');
            this.updateRecordButton('disabled', 'Microphone access denied');
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
        this.isButtonPressed = true;
        
        if (!this.isInitialized) {
            this.initializeAudio();
            return;
        }
        
        if (this.isRecording) return;
        
        this.audioChunks = [];
        this.mediaRecorder.start();
        this.isRecording = true;
        this.updateRecordButton('recording', '🔴 Recording... (Release to stop)');
        this.addMessage('Recording... Release button to stop', 'system');
    }
    
    stopRecording() {
        this.isButtonPressed = false;
        
        if (!this.isRecording || !this.mediaRecorder) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.updateRecordButton('ready', 'Hold to Record');
        this.addMessage('Processing recording...', 'system');
    }
    
    async sendAudioMessage(audioBlob) {
        try {
            this.updateRecordButton('disabled', 'Processing...');
            
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
        } finally {
            this.updateRecordButton('ready', 'Hold to Record');
        }
    }
    
    async handleStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        await this.audioStreamPlayer.initialize();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        await this.handleStreamData(data);
                    } catch (parseError) {
                        console.error('Error parsing SSE data:', parseError);
                    }
                }
            }
        }
        
        this.audioStreamPlayer.cleanup();
    }
    
    async handleStreamData(data) {
        switch (data.type) {
            case 'text':
                this.addMessage(`You: ${data.user_message}`, 'user');
                this.addMessage(`AI: ${data.response}`, 'ai');
                break;
            case 'audio_chunk':
                await this.audioStreamPlayer.playChunk(data.chunk);
                break;
            case 'audio_end':
                console.log('Audio streaming complete');
                break;
            case 'translation':
                this.addMessage(`Translation: ${data.text}`, 'translation');
                break;
            case 'complete':
                console.log('Streaming complete');
                break;
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
        this.audioContext = null;
        this.nextPlayTime = 0;
        this.sampleRate = 24000;
        this.isFirstChunk = true;
    }
    
    async initialize() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.nextPlayTime = this.audioContext.currentTime;
        this.isFirstChunk = true;
    }
    
    async playChunk(base64Chunk) {
        try {
            const floatData = AudioUtils.base64ToPCM(base64Chunk);
            
            const audioBufferNode = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
            audioBufferNode.getChannelData(0).set(floatData);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBufferNode;
            source.connect(this.audioContext.destination);
            
            const startTime = Math.max(this.nextPlayTime, this.audioContext.currentTime + 0.01);
            source.start(startTime);
            
            this.nextPlayTime = startTime + audioBufferNode.duration;
            
            if (this.isFirstChunk) {
                console.log('Started real-time audio streaming!');
                this.isFirstChunk = false;
            }
            
        } catch (error) {
            console.error('Error playing audio chunk:', error);
        }
    }
    
    cleanup() {
        if (this.audioContext) {
            setTimeout(() => this.audioContext.close(), 
                (this.nextPlayTime - this.audioContext.currentTime + 1) * 1000);
        }
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
