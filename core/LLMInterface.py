from abc import ABC, abstractmethod

class LLMInterface(ABC):

    def __init__(self, model_name: str, api_key: str = None):
        pass

    @abstractmethod
    def ask(self, prompt: str) -> str:
        pass