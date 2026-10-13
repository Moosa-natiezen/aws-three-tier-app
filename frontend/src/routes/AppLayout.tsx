import { NavLink, Outlet } from "react-router-dom";

/** UI/UX §2 — fixed left sidebar; user profile anchor lands here (Step 11). */
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
        {/* UI/UX §2: user profile anchor + logout (Step 11) */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          Not signed in
        </div>
      </aside>
      <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
