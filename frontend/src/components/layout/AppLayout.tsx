import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import { ToastProvider } from "../shared/Toast";
import { useTheme } from "../../hooks/useTheme";

export default function AppLayout() {
  useTheme();

  return (
    <ToastProvider>
      <TopNav />
      <main className="main-content">
        <Outlet />
      </main>
    </ToastProvider>
  );
}
