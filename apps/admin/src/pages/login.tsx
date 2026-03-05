import { useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";
import { setToken } from "../lib/auth";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seedToken, setSeedToken] = useState("");
  const [seedMode, setSeedMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
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
    if (res.data.user?.role !== "superadmin") {
      setError("This account is not superadmin.");
      return;
    }
    setToken(res.data.token);
    r.push("/tenants");
  }

  async function onSeed(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch<any>("/admin/seed", {
      method: "POST",
      headers: { Authorization: `Bearer ${seedToken}` },
      body: JSON.stringify({ email, password, name: "Super Admin" }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.message || "Seed failed");
      return;
    }
    setSeedMode(false);
    setError("Seeded. Now login.");
  }

  return (
    <main className="authWrap">
      <div className="authCard">
        <h1 className="authTitle">Admin Login</h1>
        <p className="authSub">Superadmin only.</p>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className={"btn " + (!seedMode ? "btnPrimary" : "")} onClick={() => setSeedMode(false)}>
            Log in
          </button>
          <button className={"btn " + (seedMode ? "btnPrimary" : "")} onClick={() => setSeedMode(true)}>
            Seed superadmin
          </button>
        </div>

        <form onSubmit={seedMode ? onSeed : onLogin} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {seedMode ? (
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Seed token</div>
              <input className="input" value={seedToken} onChange={(e) => setSeedToken(e.target.value)} placeholder="SEED_TOKEN" />
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@inonecrm.com" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Password</div>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
          </div>
          {error ? <div className="badge badgeDanger">{error}</div> : null}
          <button className="btn btnPrimary" disabled={loading}>
            {loading ? "Working…" : seedMode ? "Create superadmin" : "Log in"}
          </button>
        </form>

        <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
          Tip: Set <b>SEED_TOKEN</b> in your Worker env vars once, seed your first superadmin, then remove it.
        </p>
      </div>
    </main>
  );
}
