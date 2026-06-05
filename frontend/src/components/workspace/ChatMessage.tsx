import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage as ChatMessageType } from "../../types/chat";
import styles from "./TutorChat.module.css";

interface ChatMessageProps {
  message: ChatMessageType;
}

function ChatMessageImpl({ message }: ChatMessageProps) {
  const isTutor = message.role === "tutor";

  return (
    <div
      className={`${styles.message} ${isTutor ? styles.tutor : styles.learner} ${
        message.isStreaming ? styles.streaming : ""
      }`}
    >
      {isTutor ? (
        <div className="msg-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {message.content || "…"}
          </ReactMarkdown>
        </div>
      ) : (
        <div className={styles.learnerText}>{message.content}</div>
      )}
    </div>
  );
}

export default memo(ChatMessageImpl);
