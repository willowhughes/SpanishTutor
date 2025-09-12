let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isInitialized = false;
let isButtonPressed = false;

const recordBtn = document.getElementById('recordBtn');
const chatDiv = document.getElementById('chat');

// Initialize audio recording
async function initializeAudio() {
    if (isInitialized) return;
    
    try {
        recordBtn.textContent = 'Requesting microphone...';
        recordBtn.className = 'disabled';
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioChunks = [];
            await sendAudioMessage(audioBlob);
        };
        
        isInitialized = true;
        recordBtn.textContent = 'Hold to Record';
        recordBtn.className = 'ready';
        
        // If button is still being pressed after initialization, start recording
        if (isButtonPressed) {
            startRecording();
        }
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        addMessage('Error: Could not access microphone', 'ai');
        recordBtn.textContent = 'Microphone access denied';
        recordBtn.className = 'disabled';
    }
}

function startRecording() {
    isButtonPressed = true;
    
    if (!isInitialized) {
        initializeAudio();
        return;
    }

    if (isRecording) return; // Already recording

    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = '🔴 Recording... (Release to stop)';
    recordBtn.className = 'recording';
    addMessage('Recording... Release button to stop', 'ai');
}

function stopRecording() {
    isButtonPressed = false;
    
    if (!isRecording || !mediaRecorder) return;

    mediaRecorder.stop();
    isRecording = false;
    recordBtn.textContent = 'Hold to Record';
    recordBtn.className = 'ready';
    addMessage('Processing recording...', 'ai');
}

async function sendAudioMessage(audioBlob) {
    // Get input audio duration from the blob
    const inputDuration = await getAudioDuration(audioBlob);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('input_duration', inputDuration);
    
    try {
        recordBtn.className = 'disabled';
        recordBtn.textContent = 'Processing...';
        
        // Use streaming endpoint for real-time audio
        const response = await fetch('/chat/audio/stream', {
            method: 'POST',
            body: formData
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Set up Web Audio API for real-time audio streaming
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = 24000; // Google TTS LINEAR16 sample rate
        
        let nextPlayTime = audioContext.currentTime;
        let isFirstChunk = true;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'text') {
                            // Display messages immediately
                            addMessage(`You: ${data.user_message}`, 'user');
                            addMessage(`AI: ${data.response}`, 'ai');
                            if (data.translation) {
                                addMessage(`Translation: ${data.translation}`, 'translation');
                            }
                        } else if (data.type === 'audio_chunk') {
                            console.log(`Received audio chunk, size: ${data.chunk.length}`);
                            
                            // convert base64 to raw audio data
                            const binaryString = atob(data.chunk);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            // convert 16-bit PCM to Float32 for Web Audio API
                            const pcmData = new Int16Array(bytes.buffer);
                            const floatData = new Float32Array(pcmData.length);
                            for (let i = 0; i < pcmData.length; i++) {
                                floatData[i] = pcmData[i] / 32768.0; // Convert to -1.0 to 1.0 range
                            }
                            
                            // Schedule this chunk for immediate playback
                            const audioBufferNode = audioContext.createBuffer(1, floatData.length, sampleRate);
                            audioBufferNode.getChannelData(0).set(floatData);
                            
                            const source = audioContext.createBufferSource();
                            source.buffer = audioBufferNode;
                            source.connect(audioContext.destination);
                            
                            // Schedule playback for seamless streaming
                            const startTime = Math.max(nextPlayTime, audioContext.currentTime + 0.01);
                            source.start(startTime);
                            
                            // Update next play time
                            nextPlayTime = startTime + audioBufferNode.duration;
                            
                            if (isFirstChunk) {
                                console.log('Started real-time audio streaming!');
                                isFirstChunk = false;
                            }
                            
                        } else if (data.type === 'audio_end') {
                            console.log('Audio streaming complete');
                            // Close audio context after playback finishes
                            setTimeout(() => audioContext.close(), (nextPlayTime - audioContext.currentTime + 1) * 1000);
                        }
                    } catch (parseError) {
                        console.error('Error parsing SSE data:', parseError);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error sending audio:', error);
        addMessage('Error sending audio message', 'ai');
    } finally {
        recordBtn.className = 'ready';
        recordBtn.textContent = 'Record';
    }
}

async function playAudioChunkProgressive(audioChunkBase64, audioContext, scheduleTime) {
    try {
        // Convert base64 to array buffer
        const binaryString = atob(audioChunkBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice());
        
        // Create audio source and schedule playback
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        // Schedule to play at the right time for seamless playback
        const playTime = Math.max(scheduleTime, audioContext.currentTime);
        source.start(playTime);
        
        console.log(`Playing audio chunk at ${playTime.toFixed(2)}s`);
        
    } catch (error) {
        console.error('Error playing audio chunk:', error);
        // Fallback to simple audio element for this chunk
        try {
            const binaryString = atob(audioChunkBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBlob = new Blob([bytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
            audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl));
        } catch (fallbackError) {
            console.error('Fallback audio playback also failed:', fallbackError);
        }
    }
}

// get audio duration using Web Audio API
async function getAudioDuration(audioBlob) {
    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;
        audioContext.close();
        return duration;
    } catch (error) {
        console.error('Error getting audio duration:', error);
        // Fallback to 0 if we can't determine duration
        return 0;
    }
}

async function sendTextMessage() {
    const input = document.getElementById('input');
    const message = input.value;
    if (!message.trim()) return;
    
    addMessage(`You: ${message}`, 'user');
    input.value = '';
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: message})
        });
        
        const data = await response.json();
        addMessage(`AI: ${data.response}`, 'ai');
        
    } catch (error) {
        addMessage('Error sending message', 'ai');
    }
}

function addMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    chatDiv.appendChild(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function playAudioResponse(audioBase64) {
    try {
        // Convert base64 to binary
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create audio blob
        const audioBlob = new Blob([bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create and play audio
        const audio = new Audio(audioUrl);
        audio.play();
        
        // Clean up URL when done
        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
        });
        
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        addMessage('Click "Hold to Record" to start speaking', 'ai');
    }, 500);
});

// Prevent context menu on right click for mobile
recordBtn.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Allow Enter key to send text messages
document.getElementById('input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendTextMessage();
    }
});
