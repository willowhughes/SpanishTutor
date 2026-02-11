# Agent Reference Documentation

This document provides a technical overview of the `SpanishTutor` codebase, designed to help agents understand the architecture, key components, and complex implementation details.

## Project Overview
`SpanishTutor` is a voice-interactive Spanish learning application. It uses a Flask backend to orchestrate AI services (LLM, STT, TTS, Translation) and a React frontend for the user interface. The core loop involves the user speaking, the system transcribing, generating a response, translating it, and synthesizing speech.

## Architecture

The system follows a modular architecture where `ConversationService` acts as the central coordinator, injecting dependencies (`LLMManager`, `STTManager`, `TTSManager`, `Translator`) into the application logic.

```mermaid
graph TD
    User[User (Browser)] <-->|Audio/Events| WebApp[Flask WebApp]
    WebApp --> ConversationService
    ConversationService --> LLM[LLMManager (Groq)]
    ConversationService --> STT[STTManager (Groq/Whisper)]
    ConversationService --> TTS[TTSManager (Google Cloud)]
    ConversationService --> Translator[Translator (Google Cloud)]
```

## Key Components

### 1. WebApp (`src/flask/WebApp.py`)
- **Role**: Entry point for the web server. Serves the React frontend and exposes API endpoints.
- **Key Endpoints**:
    - `POST /chat`: Standard text-based chat.
    - `POST /chat/audio/stream`: **Complex**. Handles voice input, coordinates STT -> LLM -> Streaming TTS, and uses Server-Sent Events (SSE) to stream audio chunks back to the client.

### 2. ConversationService (`src/core/ConversationService.py`)
- **Role**: Business logic layer. Manages `MemoryState` (conversation history) and coordinates the various AI managers.
- **Dependency Injection**: Dependencies are injected at runtime in `web_main.py`.

### 3. Managers
- **LLMManager** (`src/LLMManager.py`): Interfaces with Groq API for text generation.
- **STTManager** (`src/STTManager.py`): Handles Speech-to-Text using Groq's Whisper API. Handles audio file reading and API calls.
- **TTSManager** (`src/TTSManager.py`): **Complex**. Interfaces with Google Cloud Text-to-Speech. deeply integrated with the streaming response flow.
- **Translator** (`src/Translator.py`): Uses Google Cloud Translation API for providing translations of AI responses.

## Frontend Architecture (`frontend/`)

### Tech Stack
- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS
- **Language**: TypeScript

### State Management (`App.tsx`)
The frontend uses a simple state machine to manage the interaction loop:
- `idle`: Waiting for user input.
- `recording`: User is speaking (AudioRecorder active).
- `processing`: Sending audio to backend, waiting for response.
- `playing`: Receiving audio chunks and playing them.

### Services
- `api.ts`: Handles `fetch` requests and processes the Server-Sent Events (SSE) stream.
- `AudioStreamPlayer.ts`: **Critical Component**. Manages client-side audio playback.

## Complex Implementations

### Streaming Text-to-Speech (TTS)
The streaming TTS implementation is a critical path for low-latency voice interaction.

**Flow:**
1.  **Frontend**: Captures audio and sends it to `/chat/audio/stream`.
2.  **WebApp**:
    *   Saves audio to a temp file.
    *   Calls `STTManager` to transcribe.
    *   Calls `LLMManager` to generate a response text.
    *   **Generator Function**: `_generate_streaming_response` is a Python generator that yields Server-Sent Events (SSE).
3.  **TTSManager**:
    *   `synthesize_speech_streaming(text)`: Returns a generator yielding audio chunks from Google Cloud TTS gRPC streaming API.
4.  **Streaming Response**:
    *   Initial event: Text data (User message, AI response textual).
    *   Audio events: Base64 encoded audio chunks.
    *   Final events: Audio end signal, followed by the translation.

### Client-Side Audio Streaming (`AudioStreamPlayer.ts`)
Handling real-time audio chunks in the browser is non-trivial.
- **base64ToPCM**: Converts the received base64 string into a `Float32Array` (PCM data) suitable for the Web Audio API.
- **Queueing**: Chunks are scheduled to play sequentially using `nextPlayTime`. The player ensures no gaps between chunks by scheduling the next chunk to start exactly when the previous one ends.
- **Context Management**: Handles initializing and resuming the `AudioContext` to comply with browser autoplay policies.

## Agent Onboarding / Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key
- Google Cloud Service Account (`google_credentials.json`)

### Backend Setup
1.  Create and activate virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure environment:
    - Create `.env` file with `GROQ_API_KEY`.
    - Place `google_credentials.json` in the root.
4.  Run server:
    ```bash
    python web_main.py
    ```

### Frontend Setup
1.  Navigate to frontend:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run development server:
    ```bash
    npm run dev
    ```
    (Note: `web_main.py` is configured to serve the *built* frontend in production, but for development, run the Vite server separately).
