from src.WebApp import WebApp
from src.LLMManager import LLMManager
from src.STTManager import STTManager
from src.TTSManager import TTSManager
from src.ChatManager import ChatManager
from src.Translator import Translator
from src.Utils import Utils
from dotenv import load_dotenv
import os

def main():
    load_dotenv()
    config = Utils.load_config()
    stt = STTManager(api_key=os.environ.get("GROQ_API_KEY"), model_name=config.get("stt_model_name", "whisper-large-v3-turbo"))
    llm = LLMManager(model_name=config["llm_model_name"], api_key=os.environ.get("GROQ_API_KEY"))
    tts = TTSManager(google_credentials_path=config.get("google_credentials_path", "google_credentials.json"))
    translator = Translator(google_credentials_path=config.get("google_credentials_path", "google_credentials.json"))
    chat = ChatManager(llm=llm, stt=stt, tts=tts, translator=translator, config=config)

    web_app = WebApp(chat_manager=chat)
    print("Starting server at http://127.0.0.1:5000")
    web_app.run()

if __name__ == "__main__":
    main()