/**
 * Better Auth client (UI/UX §3.2: client-side session state + route guard).
 *
 * Token flow (verified against better-auth 1.7.7 sources):
 *  - server bearer() plugin converts `Authorization: Bearer <token>` into a
 *    session internally (HMAC-verified), and exposes the raw session token
 *    via the `set-auth-token` response header on sign-in/sign-up;
 *  - here we persist that token in localStorage and attach it to every
 *    auth + API request (the SPA is cross-origin from the API, so cookies
 *    are not an option without a custom domain — PRD §3 token flow).
 */
import { createAuthClient } from "better-auth/react";

const TOKEN_KEY = "bearer_token";

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export function getBearerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setBearerToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — session stays in-memory only */
  }
}

/** Captures set-auth-token from sign-in/sign-up responses. */
function captureTokenFromResponse(response: Response): void {
  const token = response.headers.get("set-auth-token");
  if (token) setBearerToken(token);
}

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    headers: () =>
      getBearerToken() ? { Authorization: `Bearer ${getBearerToken()}` } : {},
  },
});

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await authClient.signIn.email(
    { email, password },
    { onSuccess: (ctx) => captureTokenFromResponse(ctx.response) },
  );
  if (error) throw new Error(error.message ?? "Sign-in failed");
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await authClient.signUp.email(
    { name, email, password },
    { onSuccess: (ctx) => captureTokenFromResponse(ctx.response) },
  );
  if (error) throw new Error(error.message ?? "Sign-up failed");
}

export async function signOut(): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    setBearerToken(null);
  }
}
