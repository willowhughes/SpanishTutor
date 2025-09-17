from groq import Groq
import sounddevice as sd
import soundfile as sf
import time

class STTManager():
    def __init__(self, api_key: str = None, model_name: str = "whisper-large-v3-turbo", output_audio_path = "audio/output/Recording.wav"):
        self.api_key = api_key
        if not self.api_key:
            raise ValueError("Groq API key is required. Set GROQ_API_KEY in .env or pass as argument.")
        self.client = Groq(api_key=self.api_key)
        self.model_name = model_name
        self.output_audio_path = output_audio_path

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



