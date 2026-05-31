/**
 * Voice Tutor — speech-to-text (STT) and text-to-speech (TTS).
 *
 * STT: Uses browser SpeechRecognition API (free, local).
 * TTS: Uses browser SpeechSynthesis with on-device Natural Voices.
 *
 * Both are toggleable via the speaker icon in the chat panel.
 * Voice is off by default; text chat always works.
 */

const Voice = {
  enabled: false,
  listening: false,
  speaking: false,
  recognition: null,
  synthesis: null,

  /** Preferred voice — will be set to the first "Natural" voice found. */
  preferredVoice: null,

  init() {
    this.setupRecognition();
    this.setupSynthesis();
    this.setupToggle();

    // Listen for tutor response completion to speak it
    document.addEventListener("tutor-response-complete", (e) => {
      if (this.enabled) {
        this.speak(e.detail.text);
      }
    });
  },

  // ------------------------------------------------------------------
  // Speech Recognition (STT) — learner speaks
  // ------------------------------------------------------------------
  setupRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not available in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Insert into chat input
      const input = document.getElementById("chat-input");
      input.value = transcript;
      // Auto-send after a brief pause
      setTimeout(() => {
        if (input.value === transcript) {
          Chat.sendMessage(transcript);
        }
      }, 800);
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.listening = false;
      this.updateVoiceStatus();
    };

    this.recognition.onend = () => {
      this.listening = false;
      this.updateVoiceStatus();
    };
  },

  /**
   * Start listening for learner speech.
   */
  startListening() {
    if (!this.recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (this.listening) return;

    try {
      this.recognition.start();
      this.listening = true;
      this.updateVoiceStatus();
    } catch (err) {
      console.error("Failed to start recognition:", err);
    }
  },

  /**
   * Stop listening.
   */
  stopListening() {
    if (this.recognition && this.listening) {
      this.recognition.stop();
      this.listening = false;
      this.updateVoiceStatus();
    }
  },

  // ------------------------------------------------------------------
  // Speech Synthesis (TTS) — tutor speaks
  // ------------------------------------------------------------------
  setupSynthesis() {
    this.synthesis = window.speechSynthesis;
    if (!this.synthesis) {
      console.warn("SpeechSynthesis not available in this browser.");
      return;
    }

    // Voices load asynchronously — wait for them
    if (this.synthesis.getVoices().length) {
      this.pickVoice();
    }
    this.synthesis.onvoiceschanged = () => {
      this.pickVoice();
    };
  },

  /**
   * Pick the best available voice.
   * Prefers on-device Natural Voices (Windows), falls back to defaults.
   */
  pickVoice() {
    const voices = this.synthesis.getVoices();
    if (!voices.length) return;

    // Try to find a Natural voice
    const natural = voices.find((v) => v.name.includes("Natural"));
    if (natural) {
      this.preferredVoice = natural;
      return;
    }

    // Fallback: pick a good English voice
    const english = voices.find(
      (v) => v.lang.startsWith("en") && v.localService
    );
    if (english) {
      this.preferredVoice = english;
      return;
    }

    // Last resort
    this.preferredVoice = voices[0];
  },

  /**
   * Speak text using the tutor's voice.
   */
  speak(text) {
    if (!this.synthesis || !this.enabled) return;

    // Stop any current speech
    this.synthesis.cancel();

    // Strip code blocks for speaking (they don't read well)
    const spokenText = text
      .replace(/```[\s\S]*?```/g, "(code block omitted)")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

    if (!spokenText) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.rate = 0.95; // Slightly slower for learning
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.speaking = true;
      this.updateVoiceStatus();
    };

    utterance.onend = () => {
      this.speaking = false;
      this.updateVoiceStatus();
    };

    utterance.onerror = (e) => {
      console.error("TTS error:", e);
      this.speaking = false;
      this.updateVoiceStatus();
    };

    this.synthesis.speak(utterance);
  },

  /**
   * Stop the tutor from speaking (interrupt).
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.speaking = false;
      this.updateVoiceStatus();
    }
  },

  // ------------------------------------------------------------------
  // Toggle — the speaker icon in the chat panel
  // ------------------------------------------------------------------
  setupToggle() {
    const btn = document.getElementById("btn-toggle-voice");
    if (!btn) return;

    btn.addEventListener("click", () => {
      this.enabled = !this.enabled;

      if (this.enabled) {
        btn.textContent = "🔊";
        btn.title = "Voice on — click to mute";
        this.startListening();
      } else {
        btn.textContent = "🔇";
        btn.title = "Voice off — click to enable";
        this.stopListening();
        this.stopSpeaking();
      }
    });
  },

  /**
   * Update the voice status indicator.
   */
  updateVoiceStatus() {
    const statusEl = document.getElementById("voice-status");
    const statusText = document.getElementById("voice-status-text");
    const indicator = document.querySelector(".voice-indicator");

    if (!statusEl || !statusText) return;

    if (!this.enabled) {
      statusEl.hidden = true;
      return;
    }

    statusEl.hidden = false;
    indicator.className = "voice-indicator";

    if (this.listening) {
      statusText.textContent = "🎤 Listening...";
    } else if (this.speaking) {
      statusText.textContent = "🔊 Tutor speaking...";
      indicator.classList.add("speaking");
    } else {
      statusText.textContent = "🎤 Ready — speak your question";
    }
  },
};
