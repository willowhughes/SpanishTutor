from src.STTInterface import STTInterface
from groq import Groq

class STTManager(STTInterface):
    def __init__(self, api_key: str = None, model_name: str = "whisper-large-v3-turbo"):
        self.api_key = api_key
        if not self.api_key:
            raise ValueError("Groq API key is required. Set GROQ_API_KEY in .env or pass as argument.")
        self.client = Groq(api_key=self.api_key)
        self.model_name = model_name

    def transcribe_audio(self, audio_file_path: str) -> str:
        try:
            with open(audio_file_path, "rb") as file:
                transcription = self.client.audio.transcriptions.create(
                    file=(audio_file_path, file.read()),
                    model=self.model_name,
                    response_format="verbose_json",
                )
                return transcription.text
        except Exception as e:
            print(f"Error during transcription: {e}")
            return None

