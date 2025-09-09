reqs
- python -m venv venv
- venv\Scripts\activate
- pip install -r requirements.txt
    - addtional reqs:
    - C++ build tools 


TODO:
- improve latency
    - I feel that two good ways to improve latency is to:
    - figure out streaming stt so its like iphone stt on messages where you see the words pop up as you speek and then the text is ready to send to the llm as soon as you are done speaking
    - stream the llm output one sentence at a time over to the stt so it can get started on each sentence as it's ready
    - stream the tts audio as it's ready from googles api
STT: [100ms][100ms][100ms]... → Ready ~100ms after done speaking
LLM: [sentence1: 300ms] → [sentence2: 300ms] → [sentence3: 300ms]
TTS: Starting playing asap (before whole speech is finished) [audio1: 200ms] → [audio2: 200ms] → [audio3: 200ms]