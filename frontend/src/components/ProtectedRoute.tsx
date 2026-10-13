import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../lib/auth";

/** UI/UX §3.3 — unauthenticated users are hard-routed to /login. */
export function ProtectedRoute() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading…</div>
    );
  }
  return data?.user ? <Outlet /> : <Navigate to="/login" replace />;
}
