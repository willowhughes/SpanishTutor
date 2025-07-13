from core.OllamaLLM import OllamaLLM
from core.ChatManager import ChatManager
from core.Utils import Utils

if __name__ == "__main__":
    
    config = Utils.load_config()
    llm = OllamaLLM(model_name=config["model_name"])

    chat = ChatManager(llm, config)
    chat.run_chat()