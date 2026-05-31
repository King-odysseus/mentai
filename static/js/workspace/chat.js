/**
 * AI Tutor Chat — WebSocket-based streaming chat with the DeepSeek tutor.
 * Renders markdown-formatted responses with proper structure.
 */

const Chat = {
  ws: null,
  projectId: null,
  sessionMode: "micro",
  isStreaming: false,

  init(projectId, initialMode) {
    this.projectId = projectId;
    this.sessionMode = initialMode || "micro";
    this.connect();
    this.setupUI();
  },

  connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws/chat/${this.projectId}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Chat WebSocket connected");
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

  appendDelta(text) {
    const container = document.getElementById("chat-messages");
    let lastMsg = container.querySelector(".chat-msg.streaming");

    if (!lastMsg) {
      lastMsg = document.createElement("div");
      lastMsg.className = "chat-msg tutor streaming";
      lastMsg.innerHTML = '<div class="msg-body"></div>';
      container.appendChild(lastMsg);
      this.isStreaming = true;
    }

    const body = lastMsg.querySelector(".msg-body");
    body.textContent += text;
    container.scrollTop = container.scrollHeight;
  },

  finishMessage() {
    const streaming = document.querySelector(".chat-msg.streaming");
    if (streaming) {
      streaming.classList.remove("streaming");
      // Convert markdown to HTML for rendering
      const body = streaming.querySelector(".msg-body");
      if (body) {
        const raw = body.textContent;
        body.innerHTML = this.renderMarkdown(raw);
      }
    }
    this.isStreaming = false;

    const lastTutorMsg = document.querySelector("#chat-messages .chat-msg.tutor:last-of-type .msg-body");
    if (lastTutorMsg) {
      document.dispatchEvent(
        new CustomEvent("tutor-response-complete", {
          detail: { text: lastTutorMsg.textContent },
        })
      );
    }
  },

  /**
   * Simple markdown to HTML renderer.
   * Supports: ## h2, ### h3, **bold**, ```code blocks```, `inline code`,
   * - lists, 1. numbered lists, paragraphs.
   */
  renderMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);

    // Code blocks (must be before other inline rules)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      return `<pre><code${langClass}>${escapeHtml(code)}</code></pre>`;
    });

    // Headers (## then ###)
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Lists: numbered then bullet
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li value="$1">$2</li>');
    html = html.replace(/((?:<li value="\d+">[\s\S]*?<\/li>\n?)+)/g, '<ol>$1</ol>');

    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Paragraphs: double newlines create <p> tags
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs and fix nesting
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><(h[34]|ul|ol|pre)/g, '<$1');
    html = html.replace(/<\/(h[34]|ul|ol|pre)><\/p>/g, '</$1>');

    return html;
  },

  showError(text) {
    const container = document.getElementById("chat-messages");
    const errDiv = document.createElement("div");
    errDiv.className = "chat-msg tutor";
    errDiv.innerHTML = `<p style="color:var(--glass-danger)">Error: ${escapeHtml(text)}</p>`;
    container.appendChild(errDiv);
    this.isStreaming = false;
  },

  showConceptToast(concept, mastery) {
    document.querySelectorAll(".concept-toast").forEach((t) => t.remove());
    const toast = document.createElement("div");
    toast.className = `concept-toast toast-${mastery}`;
    const icons = { introduced: "🌱", practiced: "🌿", confident: "🪴", mastered: "🌳" };
    toast.innerHTML = `
      <span class="toast-icon">${icons[mastery] || "📚"}</span>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(concept)}</div>
        <div class="toast-meta">Mastery: ${mastery}</div>
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showSpecialist(name, specialization) {
    const el = document.getElementById("chat-tutor-name");
    if (el) {
      el.textContent = name;
      el.className = `specialist-badge specialist-${specialization}`;
    }
  },

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  sendMessage(text) {
    if (!text.trim()) return;
    const container = document.getElementById("chat-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg learner";
    msgDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    this.send({
      type: "message",
      content: text,
      session_mode: this.sessionMode,
    });
    document.getElementById("chat-input").value = "";
  },

  setupUI() {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("btn-send");
    const modeSelect = document.getElementById("session-mode");

    document.addEventListener("code-review-requested", (e) => {
      this.send({
        type: "code_review",
        code: e.detail.code,
        file_path: e.detail.file_path,
        focus: e.detail.focus,
        session_mode: this.sessionMode,
      });
    });

    sendBtn.addEventListener("click", () => this.sendMessage(input.value));

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(input.value);
      }
    });

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

window.Chat = Chat;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
