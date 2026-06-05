import { useState, useRef, type KeyboardEvent } from "react";
import { useChatStore } from "../../stores/chatStore";
import styles from "./TutorChat.module.css";

interface ChatInputProps {
  onSend: (text: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

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
