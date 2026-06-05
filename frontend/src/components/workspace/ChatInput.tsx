import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useChatStore } from "../../stores/chatStore";
import styles from "./TutorChat.module.css";

interface ChatInputProps {
  onSend: (text: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function submit(text?: string) {
    const msg = (text ?? value).trim();
    if (!msg || isStreaming) return;
    onSend(msg);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  // Listen for voice-transcript events from useVoice hook (STT)
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { transcript: string };
      if (!detail?.transcript) return;
      const transcript = detail.transcript;
      setValue(transcript);
      // Auto-send after a brief pause (matching vanilla JS behavior)
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = setTimeout(() => {
        // Only send if the value hasn't been modified by the user
        setValue((current) => {
          if (current === transcript) {
            submit(transcript);
            return "";
          }
          return current;
        });
      }, 800);
    }
    document.addEventListener("voice-transcript", handler);
    return () => {
      document.removeEventListener("voice-transcript", handler);
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  return (
    <div className={styles.inputArea}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isStreaming ? "Tutor is responding…" : "Ask your tutor… (Enter to send, Shift+Enter for newline)"}
        rows={2}
        disabled={isStreaming}
      />
      <button
        type="button"
        className={styles.sendBtn}
        onClick={submit}
        disabled={isStreaming || !value.trim()}
        title="Send"
        aria-label="Send message"
      >
        ➤
      </button>
    </div>
  );
}
