from google.cloud import translate_v2 as translate
import os
from google.oauth2 import service_account

class Translator:
    def __init__(self, google_credentials_path: str = "C:/Users/Willo/Documents/projects/SpanishTutor/google_credentials.json"):
        self.google_credentials_path = google_credentials_path
        
        # Initialize with service account credentials
        credentials = service_account.Credentials.from_service_account_file(
            google_credentials_path
        )
        self.translate_client = translate.Client(credentials=credentials)

    def translate_text(self, text, target_language="en"):
        """
        Translate full text from Spanish to English (or vice versa)
        """
        try:
            result = self.translate_client.translate(text, target_language=target_language)
            return result["translatedText"]
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    def translate_word_by_word(self, sentence, target_language="en"):
        """
        Translate each word individually (rough approximation)
        """
        try:
            # Simple word splitting (not perfect for punctuation)
            words = sentence.replace("¿", "").replace("?", "").replace("¡", "").replace("!", "").split()
            
            if not words:
                return {}
            
            # Translate all words at once for efficiency
            translations = self.translate_client.translate(words, target_language=target_language)
            
            # Create word-to-translation mapping
            word_translations = {}
            for i, word in enumerate(words):
                if isinstance(translations, list):
                    word_translations[word] = translations[i]["translatedText"]
                else:
                    # Single word case
                    word_translations[word] = translations["translatedText"]
                    
            return word_translations
            
        except Exception as e:
            print(f"Word-by-word translation error: {e}")
            return {}

    def translate_es_to_en(self, text):
        """Spanish to English"""
        return self.translate_text(text, target_language="en")
    
    def translate_en_to_es(self, text):
        """English to Spanish"""
        return self.translate_text(text, target_language="es")
    
    def word_by_word_es_to_en(self, sentence):
        """Spanish sentence word-by-word to English"""
        return self.translate_word_by_word(sentence, target_language="en")
    
    def word_by_word_en_to_es(self, sentence):
        """English sentence word-by-word to Spanish"""
        return self.translate_word_by_word(sentence, target_language="es")