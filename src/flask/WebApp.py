from flask import Flask, render_template, request, jsonify, Response
import os
import tempfile
import time
import json
from src.Utils import Utils

class WebApp:
    def __init__(self, conversation):
        # tell Flask where to find templates and static files
        current_dir = os.path.dirname(__file__)
        template_dir = os.path.abspath(os.path.join(current_dir, '..', '..', 'templates'))
        static_dir = os.path.abspath(os.path.join(current_dir, '..', '..', 'templates', 'static'))
        self.app = Flask(__name__, 
                         template_folder=template_dir,
                         static_folder=static_dir,
                         static_url_path='/static')
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
                stt_ms = (time.time() - start_time) * 1000

                if not user_message:
                    return jsonify({'error': 'Could not transcribe audio'})
                
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

                start_time = time.time()
                audio_base64 = self.conversation.tts.synthesize_speech(response)
                tts_ms = (time.time() - start_time) * 1000

                output_duration_sec = self.conversation.tts.get_audio_duration(audio_base64)

                response_ms = (time.time() - response_time) * 1000

                input_duration_sec = float(request.form.get('input_duration', 0))

                Utils.log_latency(stt_ms=stt_ms, llm_ms=llm_ms, translation_ms=translate_ms, 
                                  tts_ms=tts_ms, input_duration_sec=input_duration_sec, 
                                  output_duration_sec=output_duration_sec, response_ms=response_ms)
                print(
                    f"Input duration: {input_duration_sec:.1f}s | "
                    f"Output duration: {output_duration_sec:.1f}s | "
                    f"Speech-to-Text took {stt_ms:.1f}ms | "
                    f"LLM took {llm_ms:.1f}ms | "
                    f"Translation took {translate_ms:.1f}ms | "
                    f"Text-to-Speech took {tts_ms:.1f}ms | "
                    f"Response took {response_ms:.1f}ms"
                )

                return jsonify({
                    'user_message': user_message,
                    'response': response,
                    'translation': translation,
                    'audio': audio_base64
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
        
        # Streaming TTS endpoint
        @self.app.route('/chat/audio/stream', methods=['POST'])
        def chat_audio_stream():
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
                
                response_time = time.time()
                start_time = time.time()
                user_message = self.conversation.stt.transcribe_audio(temp_file_path)
                stt_ms = (time.time() - start_time) * 1000
                if not user_message:
                    return jsonify({'error': 'Could not transcribe audio'})

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


                input_duration_sec = float(request.form.get('input_duration', 0))
                
                # Return streaming response
                def generate():
                    # Send initial data
                    yield f"data: {json.dumps({'type': 'text', 'user_message': user_message, 'response': response, 'translation': translation})}\n\n"
                    
                    try:  # Stream real-time audio chunks from Google
                        for audio_chunk in self.conversation.tts.synthesize_speech_streaming(response):
                            yield f"data: {json.dumps({'type': 'audio_chunk', 'chunk': audio_chunk})}\n\n"
                    except AttributeError: # Fallback if streaming not available
                        audio_base64 = self.conversation.tts.synthesize_speech(response)
                        yield f"data: {json.dumps({'type': 'audio_chunk', 'chunk': audio_base64})}\n\n"
                    
                    # Signal end
                    yield f"data: {json.dumps({'type': 'audio_end'})}\n\n"


                tts_ms = 100.0 # estimate for now
                response_ms = ((time.time() - response_time) * 1000) + tts_ms
                output_duration_sec = 0 # todo
                print(
                    f"Input duration: {input_duration_sec:.1f}s | "
                    f"Output duration: {output_duration_sec:.1f}s | "
                    f"Speech-to-Text took {stt_ms:.1f}ms | "
                    f"LLM took {llm_ms:.1f}ms | "
                    f"Translation took {translate_ms:.1f}ms | "
                    f"Text-to-Speech took {tts_ms:.1f}ms | "
                    f"Response took {response_ms:.1f}ms"
                )
                
                return Response(generate(), mimetype='text/plain', headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
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

    def run(self, debug=True):
        self.app.run(debug=debug)