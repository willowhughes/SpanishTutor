from abc import ABC, abstractmethod

class TTSInterface(ABC):

    def __init__(self):
        pass

    @abstractmethod
    def synthesize_speech(self, text: str) -> bytes:
        pass