import os
import subprocess
import torch
from src.Utils import Utils
from TTS.api import TTS

class TTSManager:
    def __init__(self, model_name="tts_models/multilingual/multi-dataset/xtts_v2"):
        """Initialize Coqui TTS with Spanish model"""
        try:

            self.tts = TTS(model_name=model_name, gpu=False)

        except Exception as e:
            print(f"Failed to initialize TTS: {e}")
            self.tts = None

    def stream_tts(self):
        pass

    def play_tts(self, text: str, output_file="output.wav"):
        """Generate and play TTS using Coqui TTS"""
        if not self.tts:
            print("TTS not initialized")
            return
            
        try:
            # Generate audio
            self.tts.tts_to_file(text=text, file_path=output_file)
            
            # Play the audio file (Windows)
            if os.name == 'nt':  # Windows
                os.system(f'start {output_file}')
            else:  # Linux/Mac
                os.system(f'aplay {output_file}')  # or 'afplay' on Mac
                
            print(f"Audio saved as: {output_file}")
            
        except Exception as e:
            print(f"TTS Error: {e}")