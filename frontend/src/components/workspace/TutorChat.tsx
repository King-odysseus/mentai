import { useEffect, useRef } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useChatStore } from "../../stores/chatStore";
import SpecialistBadge from "./SpecialistBadge";
import SessionControls from "./SessionControls";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ConceptToast from "./ConceptToast";
import EditorCollapseToggle from "./EditorCollapseToggle";
import styles from "./TutorChat.module.css";

interface TutorChatProps {
  projectId: number;
}

export default function TutorChat({ projectId }: TutorChatProps) {
  const { send, isConnected } = useWebSocket(projectId);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const setSessionMode = useChatStore((s) => s.setSessionMode);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content unless the user has scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSend(text: string) {
    const { sessionMode } = useChatStore.getState();
    addMessage({ id: "", role: "learner", content: text, isStreaming: false, timestamp: 0 });
    send({ type: "message", content: text, session_mode: sessionMode });
  }

  function handleModeChange(mode: "micro" | "deep") {
    setSessionMode(mode);
    send({
      type: "session_start",
      mode,
      available_minutes: mode === "deep" ? 60 : 10,
    });
  }

  // Route the Phase 5 editor "Review" button through the chat WebSocket.
  useEffect(() => {
    function onReview(e: Event) {
      const detail = (e as CustomEvent).detail as {
        path: string;
        content: string;
        focus?: string;
      };
      if (!detail?.content) return;
      const { sessionMode } = useChatStore.getState();
      const label = detail.focus
        ? `Please review \`${detail.path}\` — focus: ${detail.focus}`
        : `Please review my code in \`${detail.path}\``;
      addMessage({ id: "", role: "learner", content: label, isStreaming: false, timestamp: 0 });
      send({
        type: "code_review",
        code: detail.content,
        file_path: detail.path,
        focus: detail.focus,
        session_mode: sessionMode,
      });
    }
    document.addEventListener("code-review-requested", onReview);
    return () => document.removeEventListener("code-review-requested", onReview);
  }, [send, addMessage]);

  return (
    <div className={styles.chat}>
      <div className={styles.header}>
        <SpecialistBadge />
        <div className={styles.headerRight}>
          <span
            className={`${styles.status} ${isConnected ? styles.online : styles.offline}`}
            title={isConnected ? "Connected" : "Reconnecting…"}
          />
          <SessionControls onModeChange={handleModeChange} />
          <EditorCollapseToggle />
        </div>
      </div>

      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.greeting}>
            <p className={styles.greetingTitle}>Hi! I'm your AI tutor. 👋</p>
            <p className={styles.greetingHint}>
              Ask a question, or pick a file and hit <strong>Review</strong> to get feedback on your code.
            </p>
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}
      </div>

      <ChatInput onSend={handleSend} />
      <ConceptToast />
    </div>
  );
}
