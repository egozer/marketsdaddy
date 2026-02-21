"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export function AuthCard() {
  const { user, loading, registerWithEmail, loginWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "register") {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setBusy(true);
    setError(null);

    try {
      await loginWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-root">
      <div className="auth-card">
        <p className="hero-kicker">WELCOME TO marketsdaddy.lol</p>
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="auth-copy">
          Email verification is disabled by design. Register and start immediately.
        </p>

        <button onClick={handleGoogleLogin} className="btn btn-google" disabled={busy || loading}>
          Continue with Google
        </button>

        <div className="or-line">or</div>

        <form onSubmit={handleEmailSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@domain.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy || loading}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Register & Login"}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" ? (
            <button type="button" onClick={() => setMode("register")} className="text-btn">
              New here? Create account
            </button>
          ) : (
            <button type="button" onClick={() => setMode("login")} className="text-btn">
              Have an account? Sign in
            </button>
          )}
          <Link href="/" className="text-btn">
            Back to landing
          </Link>
        </div>
      </div>
    </main>
  );
}
