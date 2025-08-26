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
        self.is_playing = False  # Track playback status

    def synthesize_speech(self, text):
        # Wait for previous audio to finish before overwriting
        while self.is_playing:
            time.sleep(0.1)
            
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
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

        start_time = time.time()

        response = requests.post(self.url, headers=headers, json=body)
        response.raise_for_status()
        response_data = response.json()

        elapsed_ms = (time.time() - start_time) * 1000
        print(f"TTS took {elapsed_ms:.1f}ms")

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
                self.is_playing = True
                
                # Load audio
                data, samplerate = sf.read(file_path, dtype='float32')
                
                # Play using sounddevice
                sd.play(data, samplerate)
                sd.wait()  # Wait for playback to complete
                
                self.is_playing = False
                
            except Exception as e:
                print(f"Error playing audio: {e}")
                self.is_playing = False
        
        # Run audio playback in separate thread
        audio_thread = threading.Thread(target=_play_audio_thread, daemon=True)
        audio_thread.start()