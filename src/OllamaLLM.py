from src.LLMInterface import LLMInterface
import requests
from src.Utils import Utils

class OllamaLLM(LLMInterface):

    def __init__(self, model_name: str, api_key: str = None):
        self.model_name = model_name
        self.base_url = "http://localhost:11434/api"
        self.session = requests.Session()

    def ask(self, prompt: str) -> str:
        url = f"{self.base_url}/generate"
        response = self.session.post(url, json={
            "model": self.model_name,
            "prompt": prompt,
            "stream": False
        })
        response.raise_for_status()  # raise HTTPError for bad responses (4xx or 5xx)
        return Utils.clean_text(response.json()["response"])
    
