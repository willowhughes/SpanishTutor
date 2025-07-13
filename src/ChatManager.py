import os
import subprocess
from src.MemoryState import MemoryState
from src.Utils import Utils
from src.TTS import TTS

class ChatManager:

    def __init__(self, llm, config):
        self.llm = llm
        self.config = config

    def run_chat(self):
        memory = MemoryState(self.config["system_prompt"])

        while True:
            prompt = self.get_text_input()
            
            # handle commands
            cmd = self.handle_commands(prompt)
            if cmd == "/quit":
                break
            elif cmd == "/clear":
                memory = MemoryState(system_prompt=self.config["system_prompt"])
                print("Conversation cleared.\n")
                continue
            elif cmd in ["/help"]:
                continue
                
            if not prompt.strip():
                continue
            
            formatted_prompt = memory.build_prompt(prompt)
            # prompt_tokens = len(llm.tokenize(formatted_prompt.encode("utf-8", errors="ignore")))
            
            response = self.llm.ask(formatted_prompt)
            self.print_text_output(response)
            if "voice_model" in self.config:
                TTS.play_tts(self.config["voice_model"], response)

            # print(f"({prompt_tokens}/{config['context_window']} tokens used)")
            memory.add_exchange(prompt, response)
        pass

    def handle_commands(self, prompt: str):
        """handle special commands"""
        if prompt.lower() == "/clear":
            return "/clear"
        elif prompt.lower() == "/help":
            print("Todo help cmd")
            return "/help"
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
        
    def print_text_output(self, response: str):
        print(f"\n{self.config['llm_name']}: {response}\n")

    


