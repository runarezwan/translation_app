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
        this.videoFeed = document.getElementById('video-feed');
        this.subtitleEl = document.getElementById('subtitles');
        this.stream = null;
        this.subtitleTimeout = null;

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
                this.updateSubtitles(currentText);
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

        // 1. Hardware/Permission Check (Resilient approach)
        try {
            this.listeningText.textContent = 'Requesting Camera & Mic access...';
            
            try {
                // Attempt to get both
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true, 
                    video: { width: 1280, height: 720, facingMode: "user" } 
                });
                console.log('Camera and Microphone access granted');
            } catch (videoErr) {
                console.warn('Camera failed, attempting audio only:', videoErr);
                // Fallback: Try getting ONLY audio if video failed
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                this.listeningText.textContent = '⚠️ Camera unavailable. Running in Audio-Only mode.';
                this.listeningText.style.color = '#f59e0b'; // Warning color
                
                // Show a visible error in the video container
                if (this.videoFeed) {
                    const parent = this.videoFeed.parentElement;
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'video-error-msg';
                    errorMsg.textContent = 'Camera blocked or used by another app';
                    parent.appendChild(errorMsg);
                }
            }
            
            // Attach stream to video element if video tracks exist
            if (this.videoFeed && this.stream.getVideoTracks().length > 0) {
                this.videoFeed.srcObject = this.stream;
            }
            
        } catch (err) {
            console.error('Final hardware error:', err);
            this.isListening = false;
            this.setListeningUI(false);
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                this.listeningText.textContent = '❌ Access Denied! Click the LOCK icon 🔒 in the URL bar to allow Camera/Mic.';
            } else if (err.name === 'NotFoundError') {
                this.listeningText.textContent = '❌ No Camera/Microphone found on this device.';
            } else {
                this.listeningText.textContent = '❌ Hardware Error: ' + err.message;
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
        
        // Stop Camera Stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            if (this.videoFeed) {
                this.videoFeed.srcObject = null;
                // Clean up error messages
                const errorMsg = this.videoFeed.parentElement.querySelector('.video-error-msg');
                if (errorMsg) errorMsg.remove();
            }
        }
        
        this.isListening = false;
        this.setListeningUI(false);
        if (this.subtitleEl) this.subtitleEl.textContent = '';
    }

    updateSubtitles(text) {
        if (!this.subtitleEl) return;
        this.subtitleEl.textContent = text;
        
        clearTimeout(this.subtitleTimeout);
        this.subtitleTimeout = setTimeout(() => {
            if (this.subtitleEl) this.subtitleEl.textContent = '';
        }, 3000); // Hide subtitles after 3 seconds of silence
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
        if (this.subtitleEl) this.subtitleEl.textContent = '';

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
