from src.APILLM import APILLM
from src.ChatManager import ChatManager
from src.Utils import Utils
from dotenv import load_dotenv
import os

if __name__ == "__main__":

    load_dotenv()
    config = Utils.load_config()
    llm = APILLM(model_name=config["model_name"], api_key=os.environ.get("GROQ_API_KEY"))

    chat = ChatManager(llm, config)
    chat.run_chat()