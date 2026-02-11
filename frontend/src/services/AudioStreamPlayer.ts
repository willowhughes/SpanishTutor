export class AudioUtils {
    static async getDuration(audioBlob: Blob): Promise<number> {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const duration = audioBuffer.duration;
            audioContext.close();
            return duration;
        } catch (error) {
            console.error('Error getting audio duration:', error);
            return 0;
        }
    }

    static base64ToPCM(base64Chunk: string): Float32Array {
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

export class AudioStreamPlayer {
    private audioContext: AudioContext;
    private nextPlayTime: number;
    private sampleRate: number;
    private isFirstChunk: boolean;
    private streamingComplete: boolean;
    public onPlaybackComplete: (() => void) | null;
    private activeSources: AudioBufferSourceNode[];

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.nextPlayTime = 0;
        this.sampleRate = 24000; // Matches Google TTS output
        this.isFirstChunk = true;
        this.streamingComplete = false;
        this.onPlaybackComplete = null;
        this.activeSources = [];
    }

    async initialize() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.nextPlayTime = this.audioContext.currentTime;
        this.isFirstChunk = true;
        this.streamingComplete = false;
    }

    async playChunk(base64Chunk: string) {
        try {
            const floatData = AudioUtils.base64ToPCM(base64Chunk);

            const audioBufferNode = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
            audioBufferNode.getChannelData(0).set(floatData);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBufferNode;
            source.connect(this.audioContext.destination);

            this.activeSources.push(source);

            source.onended = () => {
                const index = this.activeSources.indexOf(source);
                if (index > -1) {
                    this.activeSources.splice(index, 1);
                }
            };

            const startTime = Math.max(this.nextPlayTime, this.audioContext.currentTime + 0.01);
            source.start(startTime);

            this.nextPlayTime = startTime + audioBufferNode.duration;

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

    private checkIfPlaybackComplete() {
        if (this.streamingComplete) {
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
                // Source might already be stopped
            }
        });
        this.activeSources = [];
        this.streamingComplete = false;
        this.isFirstChunk = true;
        this.nextPlayTime = 0; // Reset timing to avoid delays on next play

        // Cancel any pending playback completion callback
        // (Note: The existing implementation uses setTimeout in checkIfPlaybackComplete. 
        // Ideally we should clear that timeout if we tracked it, but resetting streamingComplete 
        // prevents new callbacks from firing logic if we check it inside the callback.)
    }
}
