/**
 * Onboarding — account creation form.
 * Submits profile data via REST, redirects to dashboard on success.
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("onboarding-form");
  const btn = document.getElementById("btn-create-account");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get("name").trim();
    if (!name) {
      alert("Please enter your name.");
      return;
    }

    btn.textContent = "Creating account...";
    btn.disabled = true;

    const profile = {
      display_name: name,
      python_level: formData.get("python_level") || "beginner",
      javascript_level: formData.get("javascript_level") || "beginner",
      html_css_level: formData.get("html_css_level") || "beginner",
      database_level: formData.get("database_level") || "beginner",
      git_level: "beginner",
      preferred_backend: formData.get("preferred_backend") || null,
      preferred_frontend: formData.get("preferred_frontend") || null,
      preferred_database: formData.get("preferred_database") || null,
      learning_goal: formData.get("learning_goal") || null,
      time_per_week: formData.get("time_per_week") || null,
      onboarding_complete: true,
    };

    try {
      // Save profile (name is included directly)
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save profile");
      }

      // Redirect to dashboard
      window.location.href = "/";
    } catch (err) {
      alert("Failed to create account: " + err.message);
      btn.textContent = "Create Account & Start Learning";
      btn.disabled = false;
    }
  });
});
