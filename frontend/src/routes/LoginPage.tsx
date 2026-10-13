import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient, signIn, signUp } from "../lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  marginTop: 6,
};

/**
 * UI/UX §2 — centered auth card over a blurred backdrop; validation states
 * before submit; Better Auth issues the session token on success (§3.3).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? (e.g. returning user with valid bearer token)
  const session = authClient.useSession();

  const emailInvalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordInvalid = password.length < 8;
  const nameInvalid = mode === "sign-up" && name.trim().length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (emailInvalid || passwordInvalid || nameInvalid) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "sign-in") await signIn(email, password);
      else await signUp(name.trim(), email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
      }}
    >
      {/* blurred backdrop (UI/UX §2) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(60% 60% at 30% 20%, rgba(79,70,229,0.15), transparent), var(--bg)",
          filter: "blur(0px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 32,
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 13 }}>
          {mode === "sign-in"
            ? "Welcome back — enter your credentials."
            : "Set a password to get started."}
        </p>

        {!session.data?.user && session.isPending === false && error && (
          <div
            style={{
              border: "1px solid var(--error)",
              borderRadius: 8,
              padding: "10px 12px",
              color: "var(--error)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => void submit(e)}>
          {mode === "sign-up" && (
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
              NAME
              <input
                style={{ ...inputStyle, borderColor: touched && nameInvalid ? "var(--error)" : "var(--border)" }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </label>
          )}

          <label style={{ display: "block", marginTop: 14, fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
            EMAIL
            <input
              type="email"
              style={{ ...inputStyle, borderColor: touched && emailInvalid ? "var(--error)" : "var(--border)" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          {touched && emailInvalid && (
            <div style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>Enter a valid email address.</div>
          )}

          <label style={{ display: "block", marginTop: 14, fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
            PASSWORD
            <input
              type="password"
              style={{ ...inputStyle, borderColor: touched && passwordInvalid ? "var(--error)" : "var(--border)" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </label>
          {touched && passwordInvalid && (
            <div style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>Password must be at least 8 characters.</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 24,
              background: submitting ? "var(--border)" : "var(--accent)",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "11px 14px",
              fontWeight: 500,
              cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {["Google", "GitHub"].map((provider) => (
            <button
              key={provider}
              disabled
              title="SSO requires an OAuth provider to be configured in Better Auth"
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "9px 12px",
                color: "var(--text-muted)",
                cursor: "not-allowed",
                fontSize: 13,
              }}
            >
              {provider} (soon)
            </button>
          ))}
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
          {mode === "sign-in" ? "No account yet?" : "Already registered?"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setTouched(false);
              setError(null);
            }}
            style={{ fontWeight: 500 }}
          >
            {mode === "sign-in" ? "Create one" : "Sign in"}
          </a>
        </p>
      </div>
    </div>
  );
}
