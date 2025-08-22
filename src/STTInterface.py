from abc import ABC, abstractmethod

class STTInterface(ABC):

    def __init__(self):
        pass

    @abstractmethod
    def transcribe_audio(self, audio: bytes) -> str:
        pass