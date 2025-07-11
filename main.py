import requests

def ask_ollama(prompt: str, model: str = "gemma3:4b") -> str:
    response = requests.post("http://localhost:11434/api/generate", json={
        "model": model,
        "prompt": prompt,
        "stream": False
    })
    return response.json()["response"]

if __name__ == "__main__":
    reply = ask_ollama("¿Cómo se dice 'apple' en español?")
    print("Gemma says:", reply)