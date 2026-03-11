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

        this.checkProtocol();
        this.initSpeechRecognition();
        this.attachEvents();
    }

    checkProtocol() {
        if (window.location.protocol === 'file:') {
            this.listeningText.textContent = '⚠️ Mic blocked on "file://". Use http://localhost:3000';
            this.listeningText.style.color = '#f59e0b'; // Amber warning color
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert('Your browser does not support Speech Recognition. Please use Chrome or Edge.');
            return;
        }

        this.isRecognizing = false; // Internal state of the engine
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        this.recognition.onstart = () => {
            this.isRecognizing = true;
            this.setListeningUI(true);
            console.log('Recognition started and active');
        };

        this.recognition.onend = async () => {
            this.isRecognizing = false;
            console.log('Recognition engine stopped');
            
            if (this.isListening) {
                // Keep listening if we didn't explicitly stop. 
                // Wait 300ms to ensure the engine has fully reset before restarting.
                setTimeout(async () => {
                    if (this.isListening && !this.isRecognizing) {
                        await this.startListening();
                    }
                }, 300);
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
            this.isListening = false;
            this.setListeningUI(false);
            
            let message = 'Error: ';
            if (event.error === 'not-allowed') {
                message += 'Microphone access denied. Please click the lock icon in the URL bar and allow microphone.';
            } else if (event.error === 'network') {
                message += 'Network error. Please check your internet.';
            } else if (event.error === 'no-speech') {
                message += 'No speech detected. Please try again.';
                // Auto-restart for 'no-speech' if we want it to be continuous
                this.isListening = true;
                setTimeout(async () => await this.startListening(), 100);
            } else {
                message += event.error;
            }
            
            this.listeningText.textContent = message;
            this.listeningText.style.color = '#ef4444'; // Red color for errors
        };
    }

    attachEvents() {
        this.micBtn.addEventListener('click', () => this.toggleListening());
        this.toggleBtn.addEventListener('click', () => this.swapLanguages());
    }

    async toggleListening() {
        console.log('Toggle Clicked. Current state:', this.isListening);
        if (this.isListening) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }

    async startListening() {
        if (!this.recognition) {
            console.error('Recognition object missing');
            this.listeningText.textContent = '❌ Error: Browser not supported';
            return;
        }

        // 1. Hardware/Permission Check First
        try {
            this.listeningText.textContent = 'Requesting Microphone access...';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Mic hardware access granted');
            // We stop the stream immediately because SpeechRecognition will open its own
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error('Mic hardware error:', err);
            this.isListening = false;
            this.setListeningUI(false);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                this.listeningText.textContent = '❌ Permission Denied! Click the LOCK icon 🔒 in the URL bar and reset mic access.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                this.listeningText.textContent = '❌ No Microphone found! Please plug in a mic.';
            } else {
                this.listeningText.textContent = '❌ Mic Error: ' + err.message;
            }
            this.listeningText.style.color = '#ef4444';
            return;
        }

        // 2. Start Speech Recognition
        if (this.isRecognizing) {
            console.log('Already recognizing, skipping start call');
            return;
        }
        
        const fromLang = this.currentMode.split('-')[0];
        this.recognition.lang = this.languages[fromLang].code;
        
        try {
            this.isListening = true; 
            this.recognition.start();
            this.listeningText.textContent = 'Connecting to microphone...';
        } catch (e) {
            // If we still get 'already started', just ignore it as it means the state is out of sync
            if (e.message.includes('already started')) {
                console.log('Suppressed: Recognition was already running.');
                this.isRecognizing = true;
                this.setListeningUI(true);
            } else {
                console.error('Recognition start error:', e);
                this.isListening = false;
                this.listeningText.textContent = 'Error: ' + e.message;
            }
        }
    }

    stopListening() {
        if (!this.recognition) return;
        console.log('Stopping recognition');
        this.recognition.stop();
        this.isListening = false;
        this.setListeningUI(false);
    }

    setListeningUI(active) {
        console.log('Updating UI for active state:', active);
        if (active) {
            this.micBtn.classList.add('active');
            this.statusIndicator.classList.add('listening');
            this.listeningText.textContent = 'Listening...';
            this.listeningText.style.color = ''; // Reset color
        } else {
            this.micBtn.classList.remove('active');
            this.statusIndicator.classList.remove('listening');
            if (!this.listeningText.textContent.startsWith('Error')) {
                this.listeningText.textContent = 'Click to start listening';
            }
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
            setTimeout(async () => await this.startListening(), 100);
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
