import { create } from "zustand";
import type { ChatMessage, SpecialistInfo } from "../types/chat";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionMode: "micro" | "deep";
  sessionId: number | null;
  specialist: SpecialistInfo | null;
  voiceEnabled: boolean;

  addMessage: (msg: ChatMessage) => void;
  appendDelta: (text: string) => void;
  finishStreaming: () => void;
  setSessionMode: (mode: "micro" | "deep") => void;
  setSessionId: (id: number) => void;
  setSpecialist: (name: string, specialization: string) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  clearMessages: () => void;
}

let msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  sessionMode: "micro",
  sessionId: null,
  specialist: null,
  voiceEnabled: false,

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: msg.id || nextId(), timestamp: msg.timestamp || Date.now() },
      ],
    })),

  appendDelta: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastMsg = msgs[msgs.length - 1];

      if (lastMsg && lastMsg.role === "tutor" && lastMsg.isStreaming) {
        msgs[msgs.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + text,
        };
      } else {
        msgs.push({
          id: nextId(),
          role: "tutor",
          content: text,
          isStreaming: true,
          timestamp: Date.now(),
        });
      }

      return { messages: msgs, isStreaming: true };
    }),

  finishStreaming: () =>
    set((s) => {
      const msgs = [...s.messages];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.role === "tutor") {
        msgs[msgs.length - 1] = { ...lastMsg, isStreaming: false };
      }
      return { messages: msgs, isStreaming: false };
    }),

  setSessionMode: (mode) => set({ sessionMode: mode }),

  setSessionId: (id) => set({ sessionId: id }),

  setSpecialist: (name, specialization) =>
    set({
      specialist: { name, specialization: specialization as SpecialistInfo["specialization"] },
    }),

  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),

  clearMessages: () => set({ messages: [], isStreaming: false }),
}));
