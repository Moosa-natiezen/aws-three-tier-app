import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { authClient, signOut } from "../lib/auth";

/** UI/UX §2 — fixed left sidebar; user profile anchor lands here (Step 11). */
function ProfileAnchor() {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "var(--accent)",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {(user?.name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.name ?? "Unknown"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email ?? ""}
          </div>
        </div>
      </div>
      <button
        onClick={async () => {
          await signOut();
          navigate("/login", { replace: true });
        }}
        style={{
          width: "100%",
          marginTop: 10,
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 10px",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Sign out
      </button>
    </div>
  );
}

export function AppLayout() {
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            padding: "4px 12px 16px",
          }}
        >
          Three-Tier App
        </div>
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            padding: "8px 12px",
            borderRadius: 6,
            color: isActive ? "var(--text)" : "var(--text-muted)",
            background: isActive ? "var(--border)" : "transparent",
            textDecoration: "none",
            fontWeight: 500,
          })}
        >
          Dashboard
        </NavLink>
        <div style={{ flex: 1 }} />
        <ProfileAnchor />
      </aside>
      <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
