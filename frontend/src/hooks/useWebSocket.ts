import { useEffect, useRef, useCallback, useState } from "react";
import { useChatStore } from "../stores/chatStore";
import type { WsIncoming, WsOutgoing } from "../types/chat";

interface UseWebSocketReturn {
  send: (data: WsOutgoing) => void;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
}

export function useWebSocket(projectId: number): UseWebSocketReturn {
  const appendDelta = useChatStore((s) => s.appendDelta);
  const finishStreaming = useChatStore((s) => s.finishStreaming);
  const setSpecialist = useChatStore((s) => s.setSpecialist);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const setSessionMode = useChatStore((s) => s.setSessionMode);
  const setWsSend = useChatStore((s) => s.setWsSend);

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback((data: WsOutgoing) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Store send in chatStore so LearningPathPanel and other components can access it
  useEffect(() => {
    setWsSend(send);
    return () => setWsSend(null);
  }, [send, setWsSend]);

  const connect = useCallback(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws/chat/${projectId}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setWsSend(send);
      send({ type: "session_start", mode: "micro", available_minutes: 10 });
    };

    ws.onmessage = (event) => {
      try {
        const data: WsIncoming = JSON.parse(event.data);
        switch (data.type) {
          case "delta":
            appendDelta(data.content || "");
            break;
          case "done":
            finishStreaming();
            // Fire tutor-response-complete so useVoice TTS can speak the response
            {
              const msgs = useChatStore.getState().messages;
              const lastTutorMsg = [...msgs].reverse().find((m) => m.role === "tutor");
              if (lastTutorMsg) {
                window.dispatchEvent(
                  new CustomEvent("tutor-response-complete", {
                    detail: { text: lastTutorMsg.content },
                  })
                );
              }
            }
            break;
          case "error":
            // Chat store could handle error display
            break;
          case "session_started":
            if (data.session_id) setSessionId(data.session_id);
            if (data.mode) setSessionMode(data.mode as "micro" | "deep");
            break;
          case "session_ended":
            break;
          case "specialist":
            if (data.name && data.specialization) {
              setSpecialist(data.name, data.specialization);
            }
            break;
          case "cycle_complete":
          case "concept_exposed":
            // Toast notification handled by ConceptToast component
            if (data.concept && data.mastery) {
              window.dispatchEvent(
                new CustomEvent("concept-exposed", {
                  detail: { concept: data.concept, mastery: data.mastery },
                })
              );
            }
            break;
          case "cycle_phase":
            // Cycle phase handled by the chat UI
            break;
        }
      } catch (err) {
        // Ignore unparseable messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Exponential backoff reconnection: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
      setIsReconnecting(true);
      setReconnectAttempt((prev) => prev + 1);
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, handling reconnection there
    };

    wsRef.current = ws;
  }, [projectId, send, appendDelta, finishStreaming, setSpecialist, setSessionId, setSessionMode, reconnectAttempt]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [projectId]); // Only reconnect on projectId change, not on attempt change (connect() handles retries internally)

  return { send, isConnected, isReconnecting, reconnectAttempt };
}
