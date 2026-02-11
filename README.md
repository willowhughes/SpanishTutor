
# SpanishTutor
![Project Banner](./assets/AppArchitecture.png)


run: cd frontend; npm run build; cd ..; python web_main.py
reqs:
- frontend:
- cd frontend
- npm install
- npm run build

- backend:
- python -m venv venv
- venv\Scripts\activate
- pip install -r requirements.txt
    - addtional reqs:
    - C++ build tools 
- python web_main.py


TODO:
- change theme a bit
- scrolling
- llm allginment (shorter text, better multilingual nuance, adapting to user ability, etc)
- improve latency
    - I feel that two good ways to improve latency is to:
    - figure out streaming stt so its like iphone stt on messages where you see the words pop up as you speek and then the text is ready to send to the llm as soon as you are done speaking
        - Use VAD to get a start on the stt when the user pauses
        - establish a session with api
        - compress speech audio
    - stream the llm output one sentence at a time over to the stt so it can get started on each sentence as it's ready
    - stream the tts audio as it's ready from googles api

STT: [100ms][100ms][100ms]... → Ready ~100ms after done speaking
LLM: [sentence1: 300ms] → [sentence2: 300ms] → [sentence3: 300ms]
Translation: separate thread
TTS: Starting playing asap (before whole speech is finished) [audio1: 200ms] → [audio2: 200ms] → [audio3: 200ms]

- Make llm tell student when things are said incorrectly
- Have a post-convo preformance eval


front end roadmap:
Week 1: Polish Current UI
Day 1-2: Better CSS styling (colors, spacing, typography)
Day 3-4: Add loading states and visual feedback
Day 5-7: Mobile responsiveness and touch improvements
Week 2: Modern JavaScript
Day 1-3: Refactor to ES6 modules and modern syntax
Day 4-5: Add error handling and better state management
Day 6-7: Implement new features (settings panel, scenario switching)
Week 3: Advanced Vanilla JS
Day 1-3: Component-like architecture (reusable functions)
Day 4-5: Add animations and smooth transitions
Day 6-7: Audio visualization and better UX
Week 4: React Basics
Day 1-2: Setup React app and understand components
Day 3-4: Convert record button and chat display to React
Day 5-7: Add state management and props
Week 5: React Features
Day 1-3: Custom hooks for audio recording
Day 4-5: Context for global state
Day 6-7: Real-time updates and streaming integration
Week 6: Polish & Deploy
Day 1-3: UI library integration (Tailwind CSS)
Day 4-5: Advanced features (scenario switching, history)
Day 6-7: Production build and deployment