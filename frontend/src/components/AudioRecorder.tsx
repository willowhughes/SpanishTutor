import React, { useState, useRef } from 'react';
import { Mic } from 'lucide-react';

interface Props {
    onRecordingComplete: (audioBlob: Blob, duration: number) => void;
    onRecordingStart?: () => void;
    disabled?: boolean;
}

export const AudioRecorder: React.FC<Props> = ({ onRecordingComplete, onRecordingStart, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    const isPreparingRef = useRef<boolean>(false);
    const shouldStopImmediatelyRef = useRef<boolean>(false);

    const startRecording = async () => {
        if (disabled) return;
        if (onRecordingStart) onRecordingStart();

        isPreparingRef.current = true;
        shouldStopImmediatelyRef.current = false;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Check if we were told to stop while getting the stream
            if (shouldStopImmediatelyRef.current) {
                stream.getTracks().forEach(track => track.stop());
                isPreparingRef.current = false;
                return;
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            startTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const duration = (Date.now() - startTimeRef.current) / 1000;
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onRecordingComplete(blob, duration);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            isPreparingRef.current = false;
        } catch (err) {
            console.error("Error accessing microphone:", err);
            isPreparingRef.current = false;
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (isPreparingRef.current) {
            shouldStopImmediatelyRef.current = true;
            return;
        }

        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="flex justify-center items-center relative">
            <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={disabled}
                className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10
                    ${isRecording
                        ? 'bg-red-500 shadow-red-500/50'
                        : 'bg-primary shadow-primary/40 hover:bg-primary/90'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
                `}
                title="Hold to record"
            >
                <div className={`
                    absolute rounded-full bg-white/20 transition-all duration-300
                    ${isRecording ? 'w-24 h-24 opacity-20' : 'w-0 h-0 opacity-0'}
                `}></div>
                <Mic className="w-8 h-8 text-white" />
            </button>
            <div className={`absolute -bottom-10 text-sm font-medium transition-opacity duration-300 whitespace-nowrap ${isRecording ? 'opacity-100 text-red-500' : 'opacity-0 text-subtle'}`}>
                {isRecording ? "Recording..." : "Hold to Talk"}
            </div>
        </div>
    );
};
