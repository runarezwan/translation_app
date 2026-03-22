/**
 * Rehan AI Translator Logic
 * Advanced features: TTS, History Log, Multi-language, Clipboard
 */

class RehanTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isRecognizing = false;
        this.stream = null;
        this.history = [];
        this.subtitleTimeout = null;

        // DOM Elements
        this.micBtn = document.getElementById('mic-btn');
        this.toggleBtn = document.getElementById('toggle-btn');
        this.langFromSelect = document.getElementById('lang-from');
        this.langToSelect = document.getElementById('lang-to');
        this.inputText = document.getElementById('input-text');
        this.outputText = document.getElementById('output-text');
        this.statusIndicator = document.getElementById('status-indicator');
        this.listeningText = document.getElementById('listening-text');
        this.videoFeed = document.getElementById('video-feed');
        this.subtitleEl = document.getElementById('subtitles');
        this.hudStatus = document.getElementById('hud-status');
        this.historyList = document.getElementById('history-list');
        this.clearHistoryBtn = document.getElementById('clear-history');
        
        // Actions
        this.speakBtn = document.getElementById('speak-btn');
        this.copyInputBtn = document.getElementById('copy-input');
        this.copyOutputBtn = document.getElementById('copy-output');

        this.initSpeechRecognition();
        this.attachEvents();
        this.loadHistory();
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.updateStatus('BROWSER NOT SUPPORTED', '#ef4444');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        this.recognition.onstart = () => {
            this.isRecognizing = true;
            this.setListeningUI(true);
            this.updateStatus('RECORDING');
        };

        this.recognition.onend = () => {
            this.isRecognizing = false;
            if (this.isListening) {
                setTimeout(() => {
                    if (this.isListening && !this.isRecognizing) this.recognition.start();
                }, 300);
            } else {
                this.setListeningUI(false);
                this.updateStatus('READY');
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
                
                if (finalTranscript) {
                    this.processTranslation(finalTranscript);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            if (event.error === 'no-speech') return;
            
            this.isListening = false;
            this.setListeningUI(false);
            
            let userMsg = 'ERROR';
            let hint = 'Recognition failed.';
            
            if (event.error === 'not-allowed') {
                userMsg = 'ACCESS DENIED';
                hint = 'Please click the LOCK 🔒 and allow MIC.';
            } else if (event.error === 'network') {
                userMsg = 'NETWORK ERROR';
                hint = 'Please check your internet connection.';
            } else if (event.error === 'audio-capture') {
                userMsg = 'MIC ERROR';
                hint = 'Microphone is already in use by another app.';
            } else {
                userMsg = 'ERR: ' + event.error.toUpperCase();
            }
            
            this.updateStatus(userMsg, '#ef4444');
            this.listeningText.textContent = hint;
        };
    }

    attachEvents() {
        this.micBtn.addEventListener('click', () => this.toggleListening());
        this.toggleBtn.addEventListener('click', () => this.swapLanguages());
        this.speakBtn.addEventListener('click', () => this.speakCurrentTranslation());
        this.copyInputBtn.addEventListener('click', () => this.copyToClipboard(this.inputText.textContent, 'Input'));
        this.copyOutputBtn.addEventListener('click', () => this.copyToClipboard(this.outputText.textContent, 'Translation'));
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Auto-stop/start on language change if listening
        [this.langFromSelect, this.langToSelect].forEach(select => {
            select.addEventListener('change', () => {
                if (this.isListening) {
                    this.stopListening();
                    setTimeout(() => this.startListening(), 200);
                }
            });
        });
    }

    async toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }

    async startListening() {
        try {
            this.updateStatus('REQUESTING MEDIA...');
            
            try {
                // Try capturing both (preferred)
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true, 
                    video: { width: 1280, height: 720, facingMode: "user" } 
                });
                if (this.videoFeed) this.videoFeed.srcObject = this.stream;
                this.updateStatus('CAM + MIC ACTIVE');
            } catch (mediaErr) {
                console.warn('Camera failed/denied, trying MIC ONLY:', mediaErr);
                // Fallback to audio only
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.updateStatus('MIC ACTIVE (NO CAM)');
                this.listeningText.textContent = 'Camera blocked, using microphone only.';
                
                // Show a small overlay on video feed if camera failed
                if (this.videoFeed) {
                    this.videoFeed.srcObject = null;
                    const parent = this.videoFeed.parentElement;
                    if (!parent.querySelector('.video-error-msg')) {
                        const errDiv = document.createElement('div');
                        errDiv.className = 'video-error-msg';
                        errDiv.textContent = 'Camera blocked or used by another app';
                        parent.appendChild(errDiv);
                    }
                }
            }
            
            this.recognition.lang = this.langFromSelect.value;
            this.isListening = true;
            this.recognition.start();
        } catch (err) {
            console.error('Final hardware error:', err);
            let userMsg = 'Hardware Error';
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                userMsg = 'ACCESS DENIED';
                this.listeningText.textContent = 'Please click the LOCK icon 🔒 in the URL bar and ALLOW the microphone.';
            } else if (err.name === 'NotFoundError') {
                userMsg = 'NO DEVICE FOUND';
                this.listeningText.textContent = 'No microphone was found on your device.';
            } else {
                userMsg = 'CONN ERROR';
                this.listeningText.textContent = err.message;
            }
            
            this.updateStatus(userMsg, '#ef4444');
            this.isListening = false;
            this.setListeningUI(false);
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.recognition) this.recognition.stop();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            if (this.videoFeed) this.videoFeed.srcObject = null;
        }
        this.setListeningUI(false);
        this.updateStatus('READY');
    }

    async processTranslation(text) {
        const from = this.langFromSelect.value.split('-')[0];
        const to = this.langToSelect.value.split('-')[0];
        
        if (from === to) {
            this.outputText.textContent = text;
            return;
        }

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                const translation = data[0][0][0];
                this.outputText.textContent = translation;
                
                // Add to history
                this.addToHistory(text, translation);
                
                // Auto-speak
                this.speakText(translation, this.langToSelect.value);
            }
        } catch (error) {
            console.error('Translation error:', error);
            this.updateStatus('TRANSLATION ERROR', '#ef4444');
        }
    }

    speakText(text, langCode) {
        if (!window.speechSynthesis || !text) return;
        
        // Stop any current speaking
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }

    speakCurrentTranslation() {
        const text = this.outputText.textContent;
        const lang = this.langToSelect.value;
        this.speakText(text, lang);
    }

    copyToClipboard(text, type) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = this.listeningText.textContent;
            this.listeningText.textContent = `${type} copied!`;
            setTimeout(() => this.listeningText.textContent = originalText, 2000);
        });
    }

    addToHistory(original, translated) {
        const item = { original, translated, timestamp: new Date().getTime() };
        this.history.unshift(item); // Add to beginning
        if (this.history.length > 50) this.history.pop();
        
        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        if (!this.historyList) return;
        
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-empty">Your conversation log will appear here...</div>';
            return;
        }

        this.historyList.innerHTML = this.history.map(item => `
            <div class="history-item">
                <div class="orig">${item.original}</div>
                <div class="trans">${item.translated}</div>
            </div>
        `).join('');
    }

    saveHistory() {
        localStorage.setItem('rehan_history', JSON.stringify(this.history));
    }

    loadHistory() {
        const saved = localStorage.getItem('rehan_history');
        if (saved) {
            this.history = JSON.parse(saved);
            this.renderHistory();
        }
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.renderHistory();
    }

    swapLanguages() {
        const temp = this.langFromSelect.value;
        this.langFromSelect.value = this.langToSelect.value;
        this.langToSelect.value = temp;
        
        // Trigger manual update
        this.langFromSelect.dispatchEvent(new Event('change'));
    }

    updateSubtitles(text) {
        if (!this.subtitleEl) return;
        this.subtitleEl.textContent = text;
        clearTimeout(this.subtitleTimeout);
        this.subtitleTimeout = setTimeout(() => {
            if (this.subtitleEl) this.subtitleEl.textContent = '';
        }, 3000);
    }

    updateStatus(text, color = null) {
        if (this.hudStatus) {
            this.hudStatus.textContent = text;
            this.hudStatus.style.color = color || 'var(--primary)';
        }
    }

    setListeningUI(active) {
        if (active) {
            this.micBtn.classList.add('active');
            this.statusIndicator.classList.add('listening');
            this.listeningText.textContent = 'Listening...';
        } else {
            this.micBtn.classList.remove('active');
            this.statusIndicator.classList.remove('listening');
            this.listeningText.textContent = 'Click mic to start';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RehanTranslator();
});
