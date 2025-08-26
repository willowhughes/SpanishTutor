from src.LLMInterface import LLMInterface
from src.Utils import Utils
import os
from groq import Groq
import time

class LLMManager(LLMInterface):

    def __init__(self, model_name: str = "llama-3.3-70b-versatile", api_key: str = None):
        self.model_name = model_name
        self.client = Groq(api_key=api_key)

    def ask(self, prompt: str) -> str:
        start_time = time.time()

        chat_completion = self.client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=self.model_name,
        )
        
        elapsed_ms = (time.time() - start_time) * 1000
        print(f"LLM took {elapsed_ms:.1f}ms")
            
        return Utils.clean_text(chat_completion.choices[0].message.content)
