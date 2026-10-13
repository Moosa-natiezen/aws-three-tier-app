/** Auth gate (UI/UX §2 auth modal) — Better Auth client lands in Step 11. */
export function LoginPage() {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 32,
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Sign in</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Better Auth email/password form arrives in Step 11.
        </p>
      </div>
    </div>
  );
}
