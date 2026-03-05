import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";
import { setSession } from "../lib/auth";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.message || "Login failed");
      return;
    }
    setSession(res.data.token, res.data.tenant.id);
    r.push("/dashboard");
  }

  return (
    <main className="authWrap">
      <div className="authCard">
        <h1 className="authTitle">Welcome back</h1>
        <p className="authSub">Log in to continue to your InOneCRM workspace.</p>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Password</div>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </div>
          {error ? <div className="badge badgeDanger">{error}</div> : null}
          <button className="btn btnPrimary" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            New here? <Link href="/signup" style={{ color: "var(--text)", textDecoration: "underline" }}>Create an account</Link>
          </span>
          <a
            href="https://inonecrm.com"
            style={{ color: "var(--muted)", fontSize: 13, textDecoration: "underline" }}
          >
            Back to website
          </a>
        </div>
      </div>
    </main>
  );
}
