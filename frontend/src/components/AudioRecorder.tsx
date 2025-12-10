import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

interface Props {
    onRecordingComplete: (audioBlob: Blob, duration: number) => void;
    disabled?: boolean;
}

export const AudioRecorder: React.FC<Props> = ({ onRecordingComplete, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);

    const startRecording = async () => {
        if (disabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            startTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const duration = (Date.now() - startTimeRef.current) / 1000;
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Use webm for browser compatibility, backend handles wav conv if needed or we convert here. 
                // Note via backend we might need wav. But let's send webm/wav as browser supports.
                onRecordingComplete(blob, duration);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone"); // Simple fallback
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="flex justify-center items-center w-full pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0 z-10">
            <motion.button
                whileTap={{ scale: 0.95 }}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={disabled}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${disabled ? 'bg-slate-700 opacity-50 cursor-not-allowed' :
                    isRecording ? 'bg-red-500 shadow-red-500/50' : 'bg-primary shadow-primary/50 hover:bg-indigo-600'
                    }`}
            >
                <AnimatePresence>
                    {isRecording && (
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ scale: 1, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full bg-red-500"
                        />
                    )}
                </AnimatePresence>
                <Mic className={`w-8 h-8 text-white ${isRecording ? 'animate-pulse' : ''}`} />
            </motion.button>
            <div className="absolute bottom-2 text-slate-400 text-xs font-medium">
                {isRecording ? "Release to Send" : "Hold to Talk"}
            </div>
        </div>
    );
};
