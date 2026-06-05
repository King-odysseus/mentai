import { useState, useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../stores/chatStore";

interface UseVoiceReturn {
  enabled: boolean;
  listening: boolean;
  speaking: boolean;
  toggle: () => void;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

export function useVoice(): UseVoiceReturn {
  const enabled = useChatStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useChatStore((s) => s.setVoiceEnabled);

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // ---- Voice picker (Natural voices preferred) ----
  const pickVoice = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;

    // Prefer on-device Natural Voices (Windows)
    const natural = voices.find((v) => v.name.includes("Natural"));
    if (natural) {
      preferredVoiceRef.current = natural;
      return;
    }

    // Fallback: first local-service English voice
    const english = voices.find(
      (v) => v.lang.startsWith("en") && v.localService
    );
    if (english) {
      preferredVoiceRef.current = english;
      return;
    }

    // Last resort
    preferredVoiceRef.current = voices[0];
  }, []);

  // ---- Speech Recognition (STT) ----
  useEffect(() => {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      // Fire a custom event so ChatInput can pick it up
      window.dispatchEvent(
        new CustomEvent("voice-transcript", { detail: { transcript } })
      );
    };

    recognition.onerror = (event: Event) => {
      console.error("Speech recognition error:", (event as SpeechRecognitionErrorEvent).error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // ---- Speech Synthesis (TTS) setup ----
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    synthesisRef.current = synth;

    if (synth.getVoices().length) {
      pickVoice();
    }
    synth.onvoiceschanged = () => pickVoice();
  }, [pickVoice]);

  // ---- Listen for tutor-response-complete to speak ----
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { text: string };
      const currentEnabled = useChatStore.getState().voiceEnabled;
      if (currentEnabled && detail?.text) {
        speakText(detail.text);
      }
    }
    document.addEventListener("tutor-response-complete", handler);
    return () => document.removeEventListener("tutor-response-complete", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- TTS speak ----
  const speakText = useCallback((text: string) => {
    const synth = synthesisRef.current;
    if (!synth) return;

    // Stop any current speech
    synth.cancel();

    // Strip code blocks for speaking (they don't read well)
    const spokenText = text
      .replace(/```[\s\S]*?```/g, "(code block omitted)")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

    if (!spokenText) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (e) => {
      console.error("TTS error:", e);
      setSpeaking(false);
    };

    synth.speak(utterance);
  }, []);

  // ---- Public API ----
  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // Already started or not supported
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      speakText(text);
    },
    [speakText]
  );

  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setSpeaking(false);
    }
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setVoiceEnabled(next);
    if (next) {
      startListening();
    } else {
      stopListening();
      stopSpeaking();
    }
  }, [enabled, setVoiceEnabled, startListening, stopListening, stopSpeaking]);

  return {
    enabled,
    listening,
    speaking,
    toggle,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
