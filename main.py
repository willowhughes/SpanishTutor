from core.OllamaLLM import OllamaLLM
from core.ChatManager import ChatManager
import json

def load_config():
    config_path = "config.json"

    # Default config in case file is missing or incomplete
    default_config = {
        "model_name": "gemma3:4b",
        "system_prompt": "",
        "llm_name": "LLM"
    }
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            user_config = json.load(f)
        # merge user config with defaults
        config = {**default_config, **user_config}
        return config
    except FileNotFoundError:
        print(f"Config file '{config_path}' not found. Using default settings.")
        return default_config
    except json.JSONDecodeError:
        print(f"Invalid JSON in '{config_path}'. Using default settings.")
        return default_config

if __name__ == "__main__":
    
    llm = OllamaLLM(model_name="gemma3:4b")
    config = load_config()

    chat = ChatManager(llm, config)
    chat.run_chat()