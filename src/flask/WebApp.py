from flask import Flask, render_template, request, jsonify, Response
import os
import tempfile
import time
import json
import threading
from src.Utils import Utils

class WebApp:
    def __init__(self, conversation):
        # tell Flask to serve the React build (frontend/dist)
        current_dir = os.path.dirname(__file__)
        project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
        dist_dir = os.path.join(project_root, 'frontend', 'dist')
        
        self.app = Flask(__name__, 
                         template_folder=dist_dir,
                         static_folder=os.path.join(dist_dir, 'assets'),
                         static_url_path='/assets')
        self.conversation = conversation
        self.setup_routes()

    def setup_routes(self):
        @self.app.route('/')
        def index():
            return render_template('index.html')
        
        @self.app.route('/chat', methods=['POST'])
        def chat():
            user_message = request.json.get('message', '')
            try:
                if not user_message.strip():
                    return "Please say something", "", 0, 0
                
                formatted_prompt = self.conversation.memory.build_prompt(user_message)

                start_time = time.time()
                response = self.conversation.llm.ask(formatted_prompt)
                llm_ms = (time.time() - start_time) * 1000

                start_time = time.time()
                translation = self.conversation.translator.translate_text(response)
                translate_ms = (time.time() - start_time) * 1000
                print(f"Translation: {translation}")

                self.conversation.memory.add_exchange(user_message, response)
                
            except Exception as e:
                print(f"Error processing message: {e}")
                return "Sorry, I encountered an error processing your message.", "", 0, 0
            audio_base64 = self.conversation.tts.synthesize_speech(response)
            return jsonify({'response': response, 'translation': translation, 'audio': audio_base64})
        
        # Streaming TTS endpoint
        @self.app.route('/chat/audio/stream', methods=['POST'])
        def chat_audio_stream():
            temp_file_path = None
            response_start = time.time()
            
            try:
                # Validate and save audio file
                audio_file = request.files.get('audio')
                if not audio_file:
                    return jsonify({'error': 'No audio file provided'})
                
                temp_file_path = self._save_audio_to_temp_file(audio_file)
                
                # Process audio input
                user_message, stt_ms = self._process_audio_input(temp_file_path)
                if not user_message:
                    return jsonify({'error': 'Could not transcribe audio'})
                
                # Generate AI response
                response, llm_ms = self._generate_ai_response(user_message)

                # Get input duration
                input_duration_sec = float(request.form.get('input_duration', 0))

                response_time = (time.time() - response_start) * 1000
                self._log_performance_metrics(input_duration_sec=input_duration_sec, stt_ms=stt_ms, llm_ms=llm_ms, response_time=response_time)

                # Return streaming response (translation happens inside the generator)
                return Response(
                    self._generate_streaming_response(user_message, response),
                    mimetype='text/plain',
                    headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'}
                )
                
            except ValueError as e:
                return jsonify({'error': str(e)})
            except Exception as e:
                print(f"Error processing audio: {e}")
                return jsonify({'error': 'Error processing audio'})
            finally:
                self._cleanup_temp_file(temp_file_path)

    def _save_audio_to_temp_file(self, audio_file):
        """Save uploaded audio file to temporary file and return path."""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file_path = temp_file.name
            audio_file.save(temp_file_path)
            return temp_file_path
    
    def _process_audio_input(self, temp_file_path):
        """Transcribe audio and return user message with timing."""
        start_time = time.time()
        user_message = self.conversation.stt.transcribe_audio(temp_file_path)
        stt_ms = (time.time() - start_time) * 1000
        return user_message, stt_ms
    
    def _generate_ai_response(self, user_message):
        """Generate AI response and return response with timing."""
        if not user_message.strip():
            raise ValueError("Empty message")
        
        formatted_prompt = self.conversation.memory.build_prompt(user_message)
        
        start_time = time.time()
        response = self.conversation.llm.ask(formatted_prompt)
        llm_ms = (time.time() - start_time) * 1000
        
        self.conversation.memory.add_exchange(user_message, response)
        return response, llm_ms
    
    def _translate(self, response):
        """Translates the ai's response to english."""
        start_time = time.time()
        translation = self.conversation.translator.translate_text(response)
        translate_ms = (time.time() - start_time) * 1000
        print(f"Translation: {translation}")
        return translation, translate_ms
    
    def _generate_streaming_response(self, user_message, response):
        """Generate streaming SSE response with audio chunks."""
        # Send initial data WITHOUT translation
        yield f"data: {json.dumps({'type': 'text', 'user_message': user_message, 'response': response})}\n\n"
        
        try:
            # Stream real-time audio chunks
            for audio_chunk in self.conversation.tts.synthesize_speech_streaming(response):
                yield f"data: {json.dumps({'type': 'audio_chunk', 'chunk': audio_chunk})}\n\n"
        except AttributeError:
            # Fallback if streaming not available
            audio_base64 = self.conversation.tts.synthesize_speech(response)
            yield f"data: {json.dumps({'type': 'audio_chunk', 'chunk': audio_base64})}\n\n"
        
        # Signal audio end
        yield f"data: {json.dumps({'type': 'audio_end'})}\n\n"

        # Translate response
        translation, translate_ms = self._translate(response)
        print(f"Translation: {translation}")
        
        # Send translation as final step
        yield f"data: {json.dumps({'type': 'translation', 'text': translation})}\n\n"
        
        # Signal complete
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    def _cleanup_temp_file(self, temp_file_path):
        """Clean up temporary file safely."""
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {temp_file_path}: {e}")

    def _log_performance_metrics(self, input_duration_sec=0, output_duration_sec=0, stt_ms=0, llm_ms=0, translation_ms=0, response_time=0):
        """Log performance metrics for debugging."""
        tts_ms = 100.0  # estimate for now
        response_ms = ((time.time() - response_time) * 1000) + tts_ms
        
        print(
            f"Input duration: {input_duration_sec:.1f}s | "
            f"Output duration: {output_duration_sec:.1f}s | "
            f"Speech-to-Text took {stt_ms:.1f}ms | "
            f"LLM took {llm_ms:.1f}ms | "
            f"Translation took {translation_ms:.1f}ms | "
            f"Text-to-Speech took {tts_ms:.1f}ms | "
            f"Response took {response_ms:.1f}ms"
        )

    def run(self, debug=True):
        self.app.run(debug=debug)