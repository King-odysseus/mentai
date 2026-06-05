/** WebSocket chat message types */

export type WsMessageType =
  | "message"
  | "session_start"
  | "session_end"
  | "teach_concept"
  | "code_review"
  | "submit_code";

export type WsResponseType =
  | "delta"
  | "done"
  | "error"
  | "session_started"
  | "session_ended"
  | "cycle_phase"
  | "cycle_complete"
  | "concept_exposed"
  | "specialist";

/** Outgoing messages (client -> server) */
export interface WsOutgoing {
  type: WsMessageType;
  content?: string;
  concept?: string;
  module_title?: string;
  code?: string;
  file_path?: string;
  focus?: string;
  mode?: string;
  available_minutes?: number;
  session_mode?: string;
  duration_minutes?: number;
  mood?: string;
}

/** Incoming messages (server -> client) */
export interface WsIncoming {
  type: WsResponseType;
  content?: string;
  concept?: string;
  mastery?: string;
  name?: string;
  specialization?: string;
  session_id?: number;
  mode?: string;
  phase?: string;
  prompt?: string;
  module_title?: string;
  timestamp?: string;
}

/** Chat message displayed in the UI */
export interface ChatMessage {
  id: string;
  role: "tutor" | "learner";
  content: string;
  isStreaming: boolean;
  timestamp: number;
}

/** Specialist tutor info */
export interface SpecialistInfo {
  name: string;
  specialization: "python" | "database" | "frontend" | "general";
}
