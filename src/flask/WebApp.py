from flask import Flask, render_template, request, jsonify
import os
import tempfile
import time

class WebApp:
    def __init__(self, conversation):
        # Tell Flask where to find templates (go up one level from src/)
        current_dir = os.path.dirname(__file__)
        template_dir = os.path.abspath(os.path.join(current_dir, '..', '..', 'templates'))
        self.app = Flask(__name__, template_folder=template_dir)
        self.conversation = conversation
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/')
        def index():
            return render_template('index.html')
        
        @self.app.route('/chat', methods=['POST'])
        def chat():
            user_input = request.json.get('message', '')
            response = self.process_message(user_input)
            return jsonify({'response': response})
        
        @self.app.route('/chat/audio', methods=['POST'])
        def chat_audio():
            temp_file_path = None
            try:
                # Get the audio file from the request
                audio_file = request.files.get('audio')
                if not audio_file:
                    return jsonify({'error': 'No audio file provided'})
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                    temp_file_path = temp_file.name
                    audio_file.save(temp_file_path)
                
                # Transcribe the audio (file is now closed)
                response_time = time.time()
                start_time = time.time()
                user_message = self.conversation.stt.transcribe_audio(temp_file_path)
                elapsed_ms = (time.time() - start_time) * 1000
                print(f"Speech-to-Text took {elapsed_ms:.1f}ms")
                
                if not user_message:
                    return jsonify({'error': 'Could not transcribe audio'})
                
                # Process the message
                response = self.process_message(user_message)

                elapsed_ms = (time.time() - response_time) * 1000
                print(f"Response took {elapsed_ms:.1f}ms")

                return jsonify({
                    'user_message': user_message,
                    'response': response
                })
                    
            except Exception as e:
                print(f"Error processing audio: {e}")
                return jsonify({'error': 'Error processing audio'})
            finally:
                # Clean up temp file
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                    except Exception as cleanup_error:
                        print(f"Warning: Could not delete temp file {temp_file_path}: {cleanup_error}")
        
        # Streaming STT endpoint
        @self.app.route('/stream/stt')
        def stream_stt():
            # Real-time transcription
            pass

        # Streaming LLM endpoint  
        @self.app.route('/stream/llm')
        def stream_llm():
            # Sentence-by-sentence generation
            pass

        # Streaming TTS endpoint
        @self.app.route('/stream/tts')
        def stream_tts():
            # Audio chunk streaming
            pass

    def process_message(self, user_input):
        """Process a message through the conversation service"""
        try:
            response_time = time.time()

            # Handle commands
            command_result = self.conversation.handle_commands(user_input)
            if command_result in self.conversation.commands:
                return "Command processed"
            
            if not user_input.strip():
                return "Please say something"
            
            # Build prompt with memory
            formatted_prompt = self.conversation.memory.build_prompt(user_input)
            
            # Get LLM response
            start_time = time.time()
            response = self.conversation.llm.ask(formatted_prompt)
            elapsed_ms = (time.time() - start_time) * 1000
            print(f"LLM took {elapsed_ms:.1f}ms")
            
            # Get word translations
            start_time = time.time()
            translation = self.conversation.translator.translate_text(response)
            elapsed_ms = (time.time() - start_time) * 1000
            print(f"Translation took {elapsed_ms:.1f}ms")
            print(f"Translation: {translation}")

            # Add to memory
            self.conversation.memory.add_exchange(user_input, response)

            return response
            
        except Exception as e:
            print(f"Error processing message: {e}")
            return "Sorry, I encountered an error processing your message."

    def run(self, debug=True):
        self.app.run(debug=debug)