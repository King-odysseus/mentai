/**
 * AI Tutor Chat — WebSocket-based streaming chat with the DeepSeek tutor.
 *
 * Connects to ws://host:9000/ws/chat/{project_id}
 * Messages stream in word-by-word from the tutor.
 */

const Chat = {
  ws: null,
  projectId: null,
  sessionMode: "micro",
  isStreaming: false,

  /**
   * Initialize chat for a project.
   */
  init(projectId, initialMode) {
    this.projectId = projectId;
    this.sessionMode = initialMode || "micro";
    this.connect();
    this.setupUI();
  },

  /**
   * Open WebSocket connection to the tutor.
   */
  connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws/chat/${this.projectId}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Chat WebSocket connected");
      // Signal session start
      this.send({ type: "session_start", mode: this.sessionMode, available_minutes: 10 });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log("Chat WebSocket closed");
      this.isStreaming = false;
    };

    this.ws.onerror = (err) => {
      console.error("Chat WebSocket error:", err);
    };
  },

  /**
   * Handle incoming WebSocket messages.
   */
  handleMessage(data) {
    switch (data.type) {
      case "delta":
        this.appendDelta(data.content);
        break;

      case "done":
        this.finishMessage();
        break;

      case "error":
        this.showError(data.content);
        break;

      case "session_started":
        console.log("Session started:", data.session_id, "mode:", data.mode);
        // Update the mode dropdown
        document.getElementById("session-mode").value = data.mode;
        this.sessionMode = data.mode;
        break;

      case "session_ended":
        console.log("Session ended");
        break;

      case "cycle_complete":
      case "concept_exposed":
        this.showConceptToast(data.concept, data.mastery);
        break;

      case "specialist":
        this.showSpecialist(data.name, data.specialization);
        break;
    }
  },

  /**
   * Append text delta to the current streaming message.
   */
  appendDelta(text) {
    const container = document.getElementById("chat-messages");
    let lastMsg = container.querySelector(".chat-msg.streaming");

    if (!lastMsg) {
      // Create new streaming message bubble
      lastMsg = document.createElement("div");
      lastMsg.className = "chat-msg tutor streaming";
      lastMsg.innerHTML = "<p></p>";
      container.appendChild(lastMsg);
      this.isStreaming = true;
    }

    const p = lastMsg.querySelector("p");
    p.textContent += text;

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  },

  /**
   * Finalize the streaming message — remove the streaming class.
   */
  finishMessage() {
    const streaming = document.querySelector(".chat-msg.streaming");
    if (streaming) {
      streaming.classList.remove("streaming");
    }
    this.isStreaming = false;

    // Notify voice module that a response is complete
    const lastMsg = document.querySelector("#chat-messages .chat-msg.tutor:last-of-type p");
    if (lastMsg) {
      document.dispatchEvent(
        new CustomEvent("tutor-response-complete", {
          detail: { text: lastMsg.textContent },
        })
      );
    }
  },

  /**
   * Show an error in the chat.
   */
  showError(text) {
    const container = document.getElementById("chat-messages");
    const errDiv = document.createElement("div");
    errDiv.className = "chat-msg tutor";
    errDiv.innerHTML = `<p style="color:var(--color-danger)">⚠️ ${escapeHtml(text)}</p>`;
    container.appendChild(errDiv);
    this.isStreaming = false;
  },

  /**
   * Show a real toast notification when a concept is mastered/reviewed.
   */
  showConceptToast(concept, mastery) {
    // Remove existing toasts
    document.querySelectorAll(".concept-toast").forEach((t) => t.remove());

    const toast = document.createElement("div");
    toast.className = `concept-toast toast-${mastery}`;
    const masteryIcons = {
      introduced: "🌱",
      practiced: "🌿",
      confident: "🪴",
      mastered: "🌳",
    };
    toast.innerHTML = `
      <span class="toast-icon">${masteryIcons[mastery] || "📚"}</span>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(concept)}</div>
        <div class="toast-meta">Mastery: ${mastery}</div>
      </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    // Auto dismiss after 3s
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Update the chat header to show which specialist is responding.
   */
  showSpecialist(name, specialization) {
    const el = document.getElementById("chat-tutor-name");
    if (el) {
      el.textContent = name;
      el.className = `specialist-badge specialist-${specialization}`;
    }
  },

  /**
   * Send a message to the tutor.
   */
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  /**
   * Send a chat message.
   */
  sendMessage(text) {
    if (!text.trim()) return;

    // Add learner message to the chat UI
    const container = document.getElementById("chat-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg learner";
    msgDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    // Send via WebSocket
    this.send({
      type: "message",
      content: text,
      session_mode: this.sessionMode,
    });

    // Clear input
    document.getElementById("chat-input").value = "";
  },

  /**
   * Set up UI event listeners.
   */
  setupUI() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("btn-send");
    const modeSelect = document.getElementById("session-mode");

    // Listen for code review requests from the editor
    document.addEventListener("code-review-requested", (e) => {
      this.send({
        type: "code_review",
        code: e.detail.code,
        file_path: e.detail.file_path,
        focus: e.detail.focus,
        session_mode: this.sessionMode,
      });
    });

    // Send button
    sendBtn.addEventListener("click", () => {
      this.sendMessage(input.value);
    });

    // Enter to send, Shift+Enter for newline
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(input.value);
      }
    });

    // Session mode toggle
    modeSelect.addEventListener("change", () => {
      this.sessionMode = modeSelect.value;
      this.send({
        type: "session_start",
        mode: this.sessionMode,
        available_minutes: this.sessionMode === "micro" ? 10 : 45,
      });
    });
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
