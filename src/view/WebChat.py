from flask import Flask, render_template, request, jsonify
import os

class WebChat:
    def __init__(self, chat_manager):
        # Tell Flask where to find templates (go up one level from src/)
        template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates'))
        self.app = Flask(__name__, template_folder=template_dir)
        self.chat_manager = chat_manager
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/')
        def index():
            return render_template('index.html')
        
        @self.app.route('/chat', methods=['POST'])
        def chat():
            user_input = request.json.get('message', '')
            # TODO: Process with your chat_manager
            return jsonify({'response': 'Hello from Flask!'})
    
    def run(self, debug=True):
        self.app.run(debug=debug)