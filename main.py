from core.OllamaLLM import OllamaLLM

if __name__ == "__main__":
    
    llm = OllamaLLM(model_name="gemma3:4b")

    reply = llm.ask("¿Cómo se dice 'apple' en español?")
    print("Gemma says:", reply)
    reply = llm.ask("How to say 'house' in spanish?")
    print("Gemma says:", reply)