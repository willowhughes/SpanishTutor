from src.LLMInterface import LLMInterface
from src.Utils import Utils
import os
from groq import Groq

class LLM(LLMInterface):

    def __init__(self, model_name: str = "llama-3.3-70b-versatile", api_key: str = None):
        self.model_name = model_name
        self.client = Groq(api_key=api_key)

    def ask(self, prompt: str) -> str:
        chat_completion = self.client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=self.model_name,
        )

        return Utils.clean_text(chat_completion.choices[0].message.content)
    
