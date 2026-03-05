import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";
import { setSession } from "../lib/auth";

export default function Signup() {
  const r = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch<any>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ tenantName, name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.message || "Signup failed");
      return;
    }
    setSession(res.data.token, res.data.tenant.id);
    r.push("/dashboard");
  }

  return (
    <main className="authWrap">
      <div className="authCard">
        <h1 className="authTitle">Create your account</h1>
        <p className="authSub">Start your 7-day trial. No card. Cancel anytime.</p>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Business name</div>
            <input className="input" value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Your business" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Your name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
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
              placeholder="8+ characters"
              type="password"
            />
          </div>

          {error ? <div className="badge badgeDanger">{error}</div> : null}

          <button className="btn btnPrimary" disabled={loading}>
            {loading ? "Creating…" : "Get started"}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Already have an account? <Link href="/login" style={{ color: "var(--text)", textDecoration: "underline" }}>Log in</Link>
          </span>
        </div>
      </div>
    </main>
  );
}
