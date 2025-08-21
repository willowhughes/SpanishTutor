import google.auth.credentials
from google.cloud import texttospeech

import json
import google.auth
from google.oauth2 import service_account
import google.auth.transport.requests
import requests
import base64

class TTSManagerAPI:

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
            with open("output.wav", "wb") as audio_file:
                audio_file.write(audio_bytes)
            print("Audio saved as output.wav")
        else:
            print("No audio content found in response.")


'''# Path to your service account JSON key file
SERVICE_ACCOUNT_FILE = "C:/Users/Willo/Documents/projects/SpanishTutor/google_credentials.json"

# Define the scopes needed for Text-to-Speech API
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

def get_access_token():
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return credentials.token

def synthesize_speech(text):
    access_token = get_access_token()

    url = "https://texttospeech.googleapis.com/v1/text:synthesize"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
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

    response = requests.post(url, headers=headers, json=body)
    response.raise_for_status()
    response_data = response.json()

    audio_content = response_data.get("audioContent")
    if audio_content:
        audio_bytes = base64.b64decode(audio_content)
        with open("output.wav", "wb") as audio_file:
            audio_file.write(audio_bytes)
        print("Audio saved as output.wav")
    else:
        print("No audio content found in response.")

if __name__ == "__main__":
    text = "hola, welcome to our session today, cómo estás, how are you doing"
    synthesize_speech(text)'''