from src.STTInterface import STTInterface
from groq import Groq
import sounddevice as sd
import soundfile as sf
import time

class STTManager(STTInterface):
    def __init__(self, api_key: str = None, model_name: str = "whisper-large-v3-turbo"):
        self.api_key = api_key
        if not self.api_key:
            raise ValueError("Groq API key is required. Set GROQ_API_KEY in .env or pass as argument.")
        self.client = Groq(api_key=self.api_key)
        self.model_name = model_name

    def record_audio(self, duration=5, sample_rate=44100):
        print(f"Recording for {duration} seconds... Speak now!")
        
        
        try:
            # Record audio
            audio_data = sd.rec(int(duration * sample_rate), 
                              samplerate=sample_rate, 
                              channels=1, 
                              dtype='float64')
            sd.wait()  # Wait until recording is finished
            
            output_path = "audio/input/Recording.wav"
            sf.write(output_path, audio_data, sample_rate)
            
            print("Recording complete!")
            return output_path
            
        except Exception as e:
            print(f"Recording failed: {e}")
            return None

    def transcribe_audio(self, audio_file_path: str) -> str:
        try:
            
            with open(audio_file_path, "rb") as file:
                transcription = self.client.audio.transcriptions.create(
                    file=(audio_file_path, file.read()),
                    model=self.model_name,
                    response_format="verbose_json",
                )

            if transcription.language != "Spanish" and transcription.language != "English":
                print(f"detected {transcription.language} defaulting to Spanish")
                with open(audio_file_path, "rb") as file:
                    transcription = self.client.audio.transcriptions.create(
                        file=(audio_file_path, file.read()),
                        model=self.model_name,
                        language="es",
                        response_format="verbose_json",
                    )
            return transcription.text
        except Exception as e:
            print(f"Error during transcription: {e}")
            return None



