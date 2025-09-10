import re
import json
import os
import csv
from datetime import datetime

class Utils:

    # regex to remove emojis
    EMOJI_PATTERN = re.compile(
        "["                               
        "\U0001F1E0-\U0001F1FF"           # flags (iOS)
        "\U0001F300-\U0001F5FF"           # symbols & pictographs
        "\U0001F600-\U0001F64F"           # emoticons
        "\U0001F680-\U0001F6FF"           # transport & map symbols
        "\U0001F700-\U0001F77F"           # alchemical symbols
        "\U0001F780-\U0001F7FF"           # geometric shapes ext.
        "\U0001F800-\U0001F8FF"           # supplemental arrows-C
        "\U0001F900-\U0001F9FF"           # supplemental symbols & pictographs
        "\U0001FA00-\U0001FA6F"           # chess symbols
        "\U0001FA70-\U0001FAFF"           # symb. & pictographs ext.-A
        "\U00002702-\U000027B0"           # dingbats
        "\U000024C2-\U0001F251"           # enclosed chars
        "\U00002500-\U00002BEF"           # various asian chars
        "\U0001F926-\U0001F937"           # additional emojis
        "\U00010000-\U0010FFFF"           # supplemental planes
        "\u2640-\u2642"                   # gender symbols
        "\u2600-\u2B55"
        "\u200D"                          # zero-width joiner
        "\u23CF\u23E9\u231A"
        "\ufe0f\u3030"
        "]+",
        flags=re.UNICODE
    )

    # regex to remove formatting chars: *, _, `, ~, etc.
    FORMAT_PATTERN = re.compile(r'[\\*_~`\[\]]')

    @staticmethod
    def clean_text(text: str) -> str:
        """Remove emojis and markup/formatting characters from text."""
        # strip emojis
        no_emoji = Utils.EMOJI_PATTERN.sub('', text)
        # strip formatting characters
        clean = Utils.FORMAT_PATTERN.sub('', no_emoji)
        # collapse extra whitespace but preserve newlines
        clean = re.sub(r'[ \t]+', ' ', clean)  # Only collapse spaces and tabs
        clean = re.sub(r'\n+', '\n', clean)    # Collapse multiple newlines to single
        return clean.strip()
    
    @staticmethod
    def load_config():
        current_dir = os.path.dirname(__file__)  # core directory
        parent_dir = os.path.dirname(current_dir)  # project root
        config_path = os.path.join(parent_dir, "config.json")

        # Default config in case file is missing or incomplete
        default_config = {
            "model_name": "gemma3:4b",
            "system_prompt": "",
            "llm_name": "LLM"
        }
        
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                user_config = json.load(f)
            # merge user config with defaults
            config = {**default_config, **user_config}
            return config
        except FileNotFoundError:
            print(f"Config file '{config_path}' not found. Using default settings.")
            return default_config
        except json.JSONDecodeError:
            print(f"Invalid JSON in '{config_path}'. Using default settings.")
            return default_config

    @staticmethod
    def log_latency(stt_ms, llm_ms, translation_ms, tts_ms, filepath="tests/latency_log.csv"):
        """Log pipeline latency to CSV, creating file with headers if it doesn't exist"""
        file_exists = os.path.exists(filepath)

        with open(filepath, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Write headers if file is new
            if not file_exists:
                writer.writerow(['timestamp', 'stt_ms', 'llm_ms', 'translation_ms', 'tts_ms', 'total_ms'])
            
            # Write data
            total_ms = stt_ms + llm_ms + translation_ms + tts_ms
            writer.writerow([
                datetime.now().isoformat(),
                round(stt_ms, 1),
                round(llm_ms, 1), 
                round(translation_ms, 1),
                round(tts_ms, 1),
                round(total_ms, 1)
            ])