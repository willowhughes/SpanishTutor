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
        recordBtn.textContent = '⏳ Requesting microphone...';
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
        recordBtn.textContent = '🎤 Hold to Record';
        recordBtn.className = 'ready';
        
        // If button is still being pressed after initialization, start recording
        if (isButtonPressed) {
            startRecording();
        }
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        addMessage('Error: Could not access microphone', 'ai');
        recordBtn.textContent = '❌ Microphone access denied';
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
    recordBtn.textContent = '🎤 Hold to Record';
    recordBtn.className = 'ready';
    addMessage('Processing recording...', 'ai');
}

async function sendAudioMessage(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    try {
        recordBtn.className = 'disabled';
        recordBtn.textContent = '⏳ Processing...';
        
        const response = await fetch('/chat/audio', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.user_message) {
            addMessage(`You: ${data.user_message}`, 'user');
        }
        if (data.response) {
            addMessage(`AI: ${data.response}`, 'ai');
        }
        if (data.translation) {
            addMessage(`Translation: ${data.translation}`, 'translation');
        }
        if (data.error) {
            addMessage(`Error: ${data.error}`, 'ai');
        }
        if (data.audio) {
            playAudioResponse(data.audio);
        }
        
    } catch (error) {
        console.error('Error sending audio:', error);
        addMessage('Error sending audio message', 'ai');
    } finally {
        recordBtn.className = 'ready';
        recordBtn.textContent = '🎤 Record';
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
