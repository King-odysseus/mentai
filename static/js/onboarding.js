/**
 * Onboarding — chat-based interview to build learner profile.
 * Connects to ws://host/ws/onboarding
 */
const Onboarding = {
  ws: null,
  profile: {},

  init() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws/onboarding`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handle(data);
    };

    this.ws.onerror = () => this.showStatus("Connection failed. Refresh the page.");
    this.ws.onclose = () => {
      if (!this.profile._saved) this.showStatus("Connection lost. Refresh to restart.");
    };

    this.setupInput();
  },

  handle(data) {
    switch (data.type) {
      case "delta":
        this.appendMessage("tutor", data.content);
        break;
      case "done":
        break;
      case "onboarding_question":
        this.showQuestion(data);
        break;
      case "onboarding_complete":
        this.saveProfile(data.profile);
        break;
    }
  },

  appendMessage(role, text) {
    const container = document.getElementById("onboarding-messages");
    const div = document.createElement("div");
    div.className = `onboarding-msg ${role}`;
    div.innerHTML = `<p>${text}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  showQuestion(data) {
    document.getElementById("onboarding-progress").hidden = false;
    document.getElementById("progress-bar-fill").style.width =
      `${(data.step / data.total) * 100}%`;
    document.getElementById("progress-text").textContent =
      `Step ${data.step}/${data.total}`;

    const hint = document.getElementById("onboarding-hint");
    if (data.hint) {
      hint.hidden = false;
      hint.textContent = data.hint;
    } else {
      hint.hidden = true;
    }

    document.getElementById("onboarding-input").focus();
  },

  setupInput() {
    const input = document.getElementById("onboarding-input");
    const sendBtn = document.getElementById("btn-onboarding-send");

    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      this.appendMessage("learner", text);
      this.ws.send(JSON.stringify({ type: "onboarding_answer", content: text }));
      input.value = "";
      input.focus();
    };

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); send(); }
    });
  },

  async saveProfile(profileData) {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          python_level: profileData.python_level || "beginner",
          javascript_level: profileData.javascript_level || "beginner",
          html_css_level: profileData.html_css_level || "beginner",
          database_level: profileData.database_level || "beginner",
          git_level: "beginner",
          preferred_backend: profileData.preferred_backend || null,
          preferred_frontend: profileData.preferred_frontend || null,
          preferred_database: null,
          learning_goal: profileData.learning_goal || null,
          time_per_week: profileData.time_per_week || null,
          onboarding_complete: true,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      this.profile._saved = true;
      this.appendMessage("tutor", "Profile saved! Redirecting to your dashboard...");
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (e) {
      this.appendMessage("tutor", `Failed to save profile: ${e.message}. Please try again or refresh.`);
    }
  },

  showStatus(msg) {
    const container = document.getElementById("onboarding-messages");
    const div = document.createElement("div");
    div.className = "onboarding-msg tutor";
    div.innerHTML = `<p style="color:var(--color-danger)">${msg}</p>`;
    container.appendChild(div);
  },
};

document.addEventListener("DOMContentLoaded", () => Onboarding.init());
