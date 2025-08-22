import os
import subprocess
import time
from src.STTManager import STTManager
from src.MemoryState import MemoryState
from src.Utils import Utils
from src.TTSManager import TTSManager

class ChatManager:

    def __init__(self, llm = None, stt = None, tts = None, config = None):
        self.llm = llm
        self.config = config
        self.stt = stt
        self.tts = tts
        self.commands = ["BREAK", "CONTINUE"]
        self.memory = MemoryState(self.config["system_prompt"])

    def run_chat(self):

        while True:
            prompt = self.get_voice_input()

            # handle commands
            loop_logic = self.handle_commands(prompt)
            if loop_logic == self.commands[0]:
                break
            elif loop_logic == self.commands[1]:
                continue

            if not prompt.strip():
                continue
            
            formatted_prompt = self.memory.build_prompt(prompt)
            # prompt_tokens = len(llm.tokenize(formatted_prompt.encode("utf-8", errors="ignore")))
            
            response = self.llm.ask(formatted_prompt)
            print(f"\n{self.config['llm_name']}: {response}\n")

            self.tts.synthesize_speech(response)
            self.tts.play_audio()

            # print(f"({prompt_tokens}/{config['context_window']} tokens used)")
            self.memory.add_exchange(prompt, response)
        pass

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
    
    def get_text_input(self):
        """input with copy-paste support"""
        try:
            prompt = input("You: ")
                
            # handle multi-line continuation with backslash
            if prompt.endswith("\\"):
                lines = [prompt[:-1]]  # remove backslash
                print("... (continue typing, empty line to finish)")
                
                while True:
                    try:
                        line = input("... ")
                        if line.strip() == "":
                            break
                        lines.append(line)
                    except EOFError:
                        break
                        
                return "\n".join(lines)
                
            return prompt
            
        except EOFError:
            return "exit"
        
    def get_voice_input(self):
        while self.tts.is_playing:
            time.sleep(0.1)
        audio_file = self.stt.record_audio(duration=8)
        
        if audio_file:
            prompt = self.stt.transcribe_audio(audio_file)
            print(f"\nYou: {prompt}\n")
            return prompt
        else:
            return "Recording failed"

    


