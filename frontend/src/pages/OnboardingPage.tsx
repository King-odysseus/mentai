import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { profileApi } from "../services/profileApi";
import { queryKeys } from "../services/queryKeys";
import { Card, Input, Select, Button, Spinner } from "../components/shared";
import type { ProfileCreate, ExperienceLevel } from "../types/profile";
import styles from "./OnboardingPage.module.css";

/* ------------------------------------------------------------------ */
/* Static option data                                                 */
/* ------------------------------------------------------------------ */

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner — just starting" },
  { value: "intermediate", label: "Intermediate — comfortable with the basics" },
  { value: "advanced", label: "Advanced — built real projects" },
];

const BACKEND_OPTIONS = [
  { value: "python+fastapi", label: "Python + FastAPI" },
  { value: "python+django", label: "Python + Django" },
  { value: "python+flask", label: "Python + Flask" },
  { value: "node+express", label: "Node.js + Express" },
  { value: "other", label: "Something else" },
];

const FRONTEND_OPTIONS = [
  { value: "react", label: "React" },
  { value: "vanilla", label: "Vanilla HTML/CSS/JS (start simple)" },
  { value: "htmx", label: "HTMX + templates" },
  { value: "vue", label: "Vue" },
  { value: "other", label: "Something else" },
];

const DATABASE_OPTIONS = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "mysql", label: "MySQL" },
  { value: "mongodb", label: "MongoDB" },
  { value: "other", label: "Something else" },
];

const GOAL_OPTIONS = [
  { value: "fullstack", label: "Full-Stack Developer" },
  { value: "backend", label: "Backend Specialist" },
  { value: "frontend", label: "Frontend Specialist" },
  { value: "exploring", label: "Just Exploring" },
];

const TIME_OPTIONS = [
  { value: "5h", label: "~5 hours (casual)" },
  { value: "10h", label: "~10 hours (regular)" },
  { value: "20h", label: "~20 hours (dedicated)" },
  { value: "30h", label: "~30+ hours (intensive)" },
];

/* ------------------------------------------------------------------ */
/* Form state                                                          */
/* ------------------------------------------------------------------ */

interface FormData {
  name: string;
  python_level: ExperienceLevel;
  javascript_level: ExperienceLevel;
  html_css_level: ExperienceLevel;
  database_level: ExperienceLevel;
  preferred_backend: string;
  preferred_frontend: string;
  preferred_database: string;
  learning_goal: string;
  time_per_week: string;
}

const DEFAULTS: FormData = {
  name: "",
  python_level: "intermediate",
  javascript_level: "beginner",
  html_css_level: "intermediate",
  database_level: "beginner",
  preferred_backend: "python+fastapi",
  preferred_frontend: "react",
  preferred_database: "postgresql",
  learning_goal: "fullstack",
  time_per_week: "10h",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Guard: if the user is already onboarded, redirect to dashboard.
  const { data: existing, isLoading: checkingProfile } = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: profileApi.get,
    retry: false,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<FormData>(DEFAULTS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (checkingProfile) {
    return <Spinner size="lg" label="Loading..." />;
  }

  if (existing?.onboarding_complete) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }) as FormData);
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: ProfileCreate) => profileApi.create(data),
    onSuccess: (profile) => {
      // Pre-populate the profile cache so RequireProfile sees it immediately
      queryClient.setQueryData(queryKeys.profile.current, profile);
      navigate("/", { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors: Record<string, string> = {};
    if (!form.name.trim()) {
      errors.name = "Please enter your name.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const profile: ProfileCreate = {
      display_name: form.name.trim(),
      python_level: form.python_level,
      javascript_level: form.javascript_level,
      html_css_level: form.html_css_level,
      database_level: form.database_level,
      git_level: "beginner",
      preferred_backend: form.preferred_backend || null,
      preferred_frontend: form.preferred_frontend || null,
      preferred_database: form.preferred_database || null,
      learning_goal: form.learning_goal || null,
      time_per_week: form.time_per_week || null,
      onboarding_complete: true,
    };

    createMutation.mutate(profile);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Create Your MentAi Account</h1>
        <p className={styles.subtitle}>
          Tell us about yourself and we'll build a personalized learning path.
        </p>
      </header>

      <Card>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Name */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>What should we call you?</h3>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="onboard-name">
                Your Name
              </label>
              <Input
                id="onboard-name"
                placeholder="e.g. Alex"
                maxLength={100}
                autoFocus
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={fieldErrors.name}
              />
            </div>
          </div>

          {/* Experience Levels */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Your Experience Level</h3>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-python">
                  Python
                </label>
                <Select
                  id="onboard-python"
                  value={form.python_level}
                  onChange={(e) => handleChange("python_level", e.target.value)}
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-js">
                  JavaScript
                </label>
                <Select
                  id="onboard-js"
                  value={form.javascript_level}
                  onChange={(e) => handleChange("javascript_level", e.target.value)}
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-html">
                  HTML &amp; CSS
                </label>
                <Select
                  id="onboard-html"
                  value={form.html_css_level}
                  onChange={(e) => handleChange("html_css_level", e.target.value)}
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-db">
                  Databases
                </label>
                <Select
                  id="onboard-db"
                  value={form.database_level}
                  onChange={(e) => handleChange("database_level", e.target.value)}
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Tech Stack Preferences */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Your Preferred Stack</h3>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-backend">
                  Backend
                </label>
                <Select
                  id="onboard-backend"
                  value={form.preferred_backend}
                  onChange={(e) => handleChange("preferred_backend", e.target.value)}
                >
                  {BACKEND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-frontend">
                  Frontend
                </label>
                <Select
                  id="onboard-frontend"
                  value={form.preferred_frontend}
                  onChange={(e) => handleChange("preferred_frontend", e.target.value)}
                >
                  {FRONTEND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-dbpref">
                  Database
                </label>
                <Select
                  id="onboard-dbpref"
                  value={form.preferred_database}
                  onChange={(e) => handleChange("preferred_database", e.target.value)}
                >
                  {DATABASE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-goal">
                  Learning Goal
                </label>
                <Select
                  id="onboard-goal"
                  value={form.learning_goal}
                  onChange={(e) => handleChange("learning_goal", e.target.value)}
                >
                  {GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="onboard-time">
                  Time Per Week
                </label>
                <Select
                  id="onboard-time"
                  value={form.time_per_week}
                  onChange={(e) => handleChange("time_per_week", e.target.value)}
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* API Error */}
          {createMutation.isError && (
            <div className={styles.error}>
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Something went wrong. Please try again."}
            </div>
          )}

          {/* Submit */}
          <div className={styles.actions}>
            <Button
              type="submit"
              variant="neo-primary"
              size="lg"
              loading={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Creating account..."
                : "Create Account & Start Learning"}
            </Button>
          </div>

          <p className={styles.footer}>
            Your profile shapes your entire learning experience — you can update it anytime.
          </p>
        </form>
      </Card>
    </div>
  );
}
