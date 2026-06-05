import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import RequireProfile from "./components/layout/RequireProfile";
import DashboardPage from "./pages/DashboardPage";
import OnboardingPage from "./pages/OnboardingPage";
import WorkspacePage from "./pages/WorkspacePage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <RequireProfile>
              <DashboardPage />
            </RequireProfile>
          }
        />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/workspace/:projectId"
          element={
            <RequireProfile>
              <WorkspacePage />
            </RequireProfile>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
