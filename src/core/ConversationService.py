import os
import subprocess
import time
from src.STTManager import STTManager
from src.core.MemoryState import MemoryState
from src.Utils import Utils
from src.TTSManager import TTSManager

class ConversationService:

    def __init__(self, llm = None, stt = None, tts = None, translator = None, config = None):
        self.llm = llm
        self.config = config
        self.stt = stt
        self.tts = tts
        self.translator = translator
        self.commands = ["BREAK", "CONTINUE"]
        self.memory = MemoryState(self.config["system_prompt"])

    def handle_commands(self, prompt: str):
        """handle special commands"""
        if prompt.lower() == "/quit":
            return self.commands[0]
        elif prompt.lower() == "/clear":
            self.memory.clear_memory()
            return self.commands[1]
        elif prompt.lower() == "/help":
            print("Todo help cmd")
            return self.commands[1]
        return prompt
        
    def get_voice_input(self):
        while self.tts.is_playing:
            time.sleep(0.1)
        audio_file = self.stt.record_audio(duration=8)
        
        if audio_file:
            start_time = time.time()
            prompt = self.stt.transcribe_audio(audio_file)
            elapsed_ms = (time.time() - start_time) * 1000
            print(f"Speech-to-Text took {elapsed_ms:.1f}ms")
            print(f"\nYou: {prompt}\n")
            return prompt
        else:
            return "Recording failed"

    


