class MemoryState: # TODO: This could definitely be optimized

    def __init__(self, system_prompt="", roleplay_scenario="", max_exchanges=32):
        self.system_prompt = system_prompt
        self.roleplay_scenario = roleplay_scenario
        self.history = []
        self.max_exchanges = max_exchanges

    def set_roleplay_scenario(self, scenario_prompt):
        self.roleplay_scenario = scenario_prompt
    
    def add_exchange(self, user_msg, assistant_msg):
        self.history.append((user_msg, assistant_msg))
        if len(self.history) > self.max_exchanges:
            self.history.pop(0)
    
    def build_prompt(self, new_msg):
        prompt = ""
        
        # Include system prompt if first message
        if not self.history and self.system_prompt:
            prompt = f"<start_of_turn>user\n{self.system_prompt}\n\n"
            if self.roleplay_scenario:
                prompt += f"{self.roleplay_scenario}\n\n"  # Add scenario prompt
            prompt += f"{new_msg}<end_of_turn>\n<start_of_turn>model\n"
        else:
            # add past exchanges
            for user_msg, assistant_msg in self.history:
                prompt += f"<start_of_turn>user\n{user_msg}<end_of_turn>\n"
                prompt += f"<start_of_turn>model\n{assistant_msg}<end_of_turn>\n"
            
            # add the new user message
            prompt += f"<start_of_turn>user\n{new_msg}<end_of_turn>\n<start_of_turn>model\n"
        
        return prompt

    def clear_memory(self):
        self.history = []