import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import { useTheme } from "../../hooks/useTheme";

export default function AppLayout() {
  useTheme(); // Syncs Zustand theme to <html data-theme>

  return (
    <>
      <TopNav />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
