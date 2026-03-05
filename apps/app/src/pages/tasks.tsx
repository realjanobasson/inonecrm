import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { PaywallBanner } from "../components/PaywallBanner";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/useSession";

export default function Tasks() {
  const { session, loading } = useRequireAuth();
  const tenantId = session?.tenant.id || "";

  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [paywalled, setPaywalled] = useState("");

  async function load() {
    if (!tenantId) return;
    setPaywalled("");
    const res = await apiFetch<any>(`/tenants/${tenantId}/tasks`);
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setItems(res.data.items);
  }

  useEffect(() => {
    if (!tenantId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function add() {
    if (!title.trim()) return;
    const res = await apiFetch<any>(`/tenants/${tenantId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setTitle("");
    await load();
  }

  async function toggle(t: any) {
    await apiFetch<any>(`/tenants/${tenantId}/tasks/${t.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: t.status === "done" ? "open" : "done" }),
    });
    await load();
  }

  if (loading) {
    return (
      <main className="authWrap">
        <div className="authCard">
          <h1 className="authTitle">Loading…</h1>
        </div>
      </main>
    );
  }

  return (
    <Layout title="Tasks">
      {paywalled ? <PaywallBanner message={paywalled} /> : null}

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" style={{ width: 380 }} />
          <button className="btn btnPrimary" onClick={add}>Add</button>
          <button className="btn" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th style={{ width: 140 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 700 }}>{t.title}</td>
                <td>{t.status === "done" ? <span className="badge badgeAccent">Done</span> : <span className="badge">Open</span>}</td>
                <td>
                  <button className="btn" onClick={() => toggle(t)}>
                    {t.status === "done" ? "Reopen" : "Complete"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)", padding: 14 }}>
                  No tasks yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
