import torch
from TTS.api import TTS
import os

#tts_models/multilingual/multi-dataset/xtts_v2

# Check if CUDA is installed
if torch.cuda.is_available():
    print("CUDA installed successfully\n") 
    device = "cuda"
else:
    print("CUDA not properly installed. Using CPU...")
    device = "cpu"

# Print available TTS models
view_models = input("View models? [y/n]\n")
if view_models == "y":
    tts_manager = TTS().list_models()
    all_models = tts_manager.list_models()
    print("TTS models:\n", all_models, "\n", sep = "")


#model = input("Enter model:\n")
model = "tts_models/multilingual/multi-dataset/xtts_v2"

# Example voice cloning with selected model
print("Loading model...")
tts = TTS(model, progress_bar=True).to(device)

text = input("Enter text:\n")
print("Generating speech...")
try:
    tts.tts_to_file(text, speaker_wav="voicesamples/ana3en.wav", language="es", file_path="output.wav", )
    print("Voice cloning completed! Check output.wav")
except Exception as e:
    print(f"Error during voice cloning: {e}")
    print("This might be due to model compatibility issues. Try using a different model or shorter audio sample.")
