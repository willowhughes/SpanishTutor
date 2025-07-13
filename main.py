from src.OllamaLLM import OllamaLLM
from src.ChatManager import ChatManager
from src.Utils import Utils

if __name__ == "__main__":
    
    config = Utils.load_config()
    llm = OllamaLLM(model_name=config["model_name"])

    chat = ChatManager(llm, config)
    chat.run_chat()