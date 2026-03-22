# Rehan.AI | Cyberpunk Real-time Translator ⚡🏙️

A premium, futuristic real-time voice translator with a high-energy **Cyberpunk Remix** aesthetic. Seamlessly translate between multiple languages with a zero-latency feel, built-in Text-to-Speech recovery, and secure session history.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-reha.ai-00ffff.svg)](https://github.com/runarezwan/translation_app/tree/main)

---

## 🎨 Design Philosophy
*   **Neon Spectrum**: High-contrast Cyberpunk palette with Neon Cyan, Cyber Pink, and Electric Purple.
*   **Dynamic Background**: Moving 3D grid with "Scanline" interference and flickering neon sign effects.
*   **Glassmorphism**: Semi-transparent, heavy-blur tech cards with aggressive industrial angles.
*   **Tech HUD**: Specialized Heads-Up Display for hardware status and real-time connectivity feedback.

## ✨ Core Features
- **🎙️ Real-time Speech-to-Text**: Fast, continuous voice recognition across multiple languages.
- **🔊 Multi-voice Text-to-Speech**: Automatic readout of translations with native accents.
- **🌍 Dynamic Language Selection**: Quickly swap between English, Finnish, Spanish, French, German, and Japanese.
- **📜 Session History Log**: A persistent sidebar/section that keeps track of the current conversation (stored in `localStorage`).
- **📋 Smart Clipboard**: Integrated icons to copy input or translated text with a single click.
- **🛡️ Hardware Resiliency**: Graceful fallback to audio-only if the camera is blocked or occupied.

## 🚀 Getting Started

To run the application locally, you just need a simple HTTP server (local or hosted) to enable the microphone and camera access.

### Quick Run (via Node):
```bash
npx serve .
```

### Manual Run:
Simply serve the `index.html` from any local hosting environment (VS Code Live Server, Python's `http.server`, etc.).

---

## 🔧 Technical Details
- **Frontend**: Vanilla JavaScript, HTML5, CSS3.
- **APIs**:
  - `Web Speech API (SpeechRecognition)`: For real-time voice capture.
  - `SpeechSynthesis`: For natural-sounding translation output.
  - `Google Translate Endpoint`: Fast, client-side translation without API keys.
  - `Navigator Clipboard API`: For one-click text management.

## 🤝 Contribution
Contributions to the neon world are welcome! Feel free to fork and pull.

---

**Link to Project**: [https://github.com/runarezwan/translation_app/tree/main](https://github.com/runarezwan/translation_app/tree/main)  
Developed with ❤️ by the Rehan.AI Cyber Team
