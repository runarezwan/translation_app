/**
 * Lumina Translate Logic
 * Handles real-time speech recognition and translation
 */

class LuminaTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentMode = 'en-fi'; // 'en-fi' or 'fi-en'
        this.languages = {
            'en': { code: 'en-US', label: 'English', api: 'en' },
            'fi': { code: 'fi-FI', label: 'Finnish', api: 'fi' }
        };

        // DOM Elements
        this.micBtn = document.getElementById('mic-btn');
        this.toggleBtn = document.getElementById('toggle-btn');
        this.inputText = document.getElementById('input-text');
        this.outputText = document.getElementById('output-text');
        this.statusIndicator = document.getElementById('status-indicator');
        this.listeningText = document.getElementById('listening-text');
        this.langFromLabel = document.getElementById('lang-from-label');
        this.langToLabel = document.getElementById('lang-to-label');

        this.initSpeechRecognition();
        this.attachEvents();
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert('Your browser does not support Speech Recognition. Please use Chrome or Edge.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        this.recognition.onstart = () => {
            this.setListeningUI(true);
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Keep listening if we didn't explicitly stop
                this.recognition.start();
            } else {
                this.setListeningUI(false);
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const currentText = finalTranscript || interimTranscript;
            if (currentText) {
                this.inputText.textContent = currentText;
                this.translate(currentText);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please enable it in browser settings.');
                this.stopListening();
            }
        };
    }

    attachEvents() {
        this.micBtn.addEventListener('click', () => this.toggleListening());
        this.toggleBtn.addEventListener('click', () => this.swapLanguages());
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.recognition) return;
        
        // Set recognition language based on current mode
        const fromLang = this.currentMode.split('-')[0];
        this.recognition.lang = this.languages[fromLang].code;
        
        try {
            this.recognition.start();
            this.isListening = true;
        } catch (e) {
            console.error('Recognition already started');
        }
    }

    stopListening() {
        if (!this.recognition) return;
        this.recognition.stop();
        this.isListening = false;
        this.setListeningUI(false);
    }

    setListeningUI(active) {
        if (active) {
            this.micBtn.classList.add('active');
            this.statusIndicator.classList.add('listening');
            this.listeningText.textContent = 'Listening...';
        } else {
            this.micBtn.classList.remove('active');
            this.statusIndicator.classList.remove('listening');
            this.listeningText.textContent = 'Click to start listening';
        }
    }

    swapLanguages() {
        this.currentMode = this.currentMode === 'en-fi' ? 'fi-en' : 'en-fi';
        
        // Update Labels
        if (this.currentMode === 'en-fi') {
            this.langFromLabel.textContent = 'English';
            this.langToLabel.textContent = 'Finnish';
        } else {
            this.langFromLabel.textContent = 'Finnish';
            this.langToLabel.textContent = 'English';
        }

        // Reset text boxes
        this.inputText.textContent = '';
        this.outputText.textContent = '';

        // Restart recognition with new language if it was running
        if (this.isListening) {
            this.stopListening();
            setTimeout(() => this.startListening(), 100);
        }
    }

    /**
     * Translates text using a fast Google Translate endpoint
     * Uses client=gtx which is fast and doesn't require keys for low-volume demos
     */
    async translate(text) {
        if (!text.trim()) return;

        const [from, to] = this.currentMode.split('-');
        const sourceLang = this.languages[from].api;
        const targetLang = this.languages[to].api;

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURI(text)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            // Google Translate response format: [[["Translated text", "Source text", ...]]]
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                this.outputText.textContent = data[0][0][0];
            }
        } catch (error) {
            console.error('Translation error:', error);
            this.outputText.textContent = "Error: Use a VPN or check internet connection.";
        }
    }
}

// Initialize application
window.addEventListener('DOMContentLoaded', () => {
    new LuminaTranslator();
});
