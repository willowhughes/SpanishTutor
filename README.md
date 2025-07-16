reqs
- download:
    - python 3.11.9
    - CUDA 12.8 (11.8 might work better)
    - Download "cudnn-windows-x86_64-8.9.7.29_cuda12-archive", extract it, and then copy what's inside the cuda folder into C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8
- (skip this step unless something doesn't work) git clone https://github.com/coqui-ai/TTS.git 
- py -3.11 -m venv venv
- venv\Scripts\activate
- pip install -r working_requirements.txt
- pip install torch==2.2.0+cu118 torchvision==0.17.0+cu118 torchaudio==2.2.0 -f https://download.pytorch.org/whl/torch_stable.html