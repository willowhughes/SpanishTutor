import google.auth.credentials
from google.cloud import texttospeech
import json
import google.auth
from google.oauth2 import service_account
import google.auth.transport.requests
import requests
import base64
from src.TTSInterface import TTSInterface
import sounddevice as sd
import soundfile as sf
import threading
import time

class TTSManager(TTSInterface):

    def __init__(self, google_credentials_path: str = "C:/Users/Willo/Documents/projects/SpanishTutor/google_credentials.json"):
        self.google_credentials_path = google_credentials_path
        credentials = service_account.Credentials.from_service_account_file(
            google_credentials_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)
        self.access_token = credentials.token
        self.url = "https://texttospeech.googleapis.com/v1/text:synthesize"

    def synthesize_speech(self, text):
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            # If you want to set your Google Cloud project explicitly (optional):
            # "X-Goog-User-Project": "your-project-id"
        }

        body = {
            "input": {
                "markup": text
            },
            "voice": {
                "languageCode": "es-US",
                "name": "es-US-Chirp3-HD-Achernar",
                "voiceClone": {}
            },
            "audioConfig": {
                "audioEncoding": "LINEAR16"
            }
        }

        response = requests.post(self.url, headers=headers, json=body)
        response.raise_for_status()
        response_data = response.json()

        audio_content = response_data.get("audioContent")
        if audio_content:
            audio_bytes = base64.b64decode(audio_content)
            with open("audio/output/output.wav", "wb") as audio_file:
                audio_file.write(audio_bytes)
            print("Audio saved as audio/output/output.wav")
        else:
            print("No audio content found in response.")

    def play_audio(self, file_path="audio/output/output.wav"):
        def _play_audio_thread():
            try:
                # Load audio
                data, samplerate = sf.read(file_path, dtype='float32')
                
                # Play using sounddevice (non-blocking)
                sd.play(data, samplerate)
                
            except Exception as e:
                print(f"Error playing audio: {e}")
        
        # Run audio playback in separate thread so it doesn't block
        audio_thread = threading.Thread(target=_play_audio_thread, daemon=True)
        audio_thread.start()