import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { PaywallBanner } from "../components/PaywallBanner";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/useSession";

export default function Contacts() {
  const { session, loading } = useRequireAuth();
  const tenantId = session?.tenant.id || "";

  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [paywalled, setPaywalled] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!tenantId) return;
    setPaywalled("");
    const res = await apiFetch<any>(`/tenants/${tenantId}/contacts?q=${encodeURIComponent(q)}`);
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

  async function addContact() {
    if (!tenantId || !fullName.trim()) return;
    setBusy(true);
    const res = await apiFetch<any>(`/tenants/${tenantId}/contacts`, {
      method: "POST",
      body: JSON.stringify({ fullName, email, phone }),
    });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setFullName("");
    setEmail("");
    setPhone("");
    await load();
  }

  async function remove(id: string) {
    if (!tenantId) return;
    if (!confirm("Delete this contact?")) return;
    await apiFetch<any>(`/tenants/${tenantId}/contacts/${id}`, { method: "DELETE" });
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
    <Layout title="Contacts">
      {paywalled ? <PaywallBanner message={paywalled} /> : null}

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone…" style={{ width: 280 }} />
            <button className="btn" onClick={load}>Search</button>
          </div>
          <span className="badge">{items.length} contacts</span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "2fr 1.3fr 1.1fr auto", gap: 10 }}>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <button className="btn btnPrimary" onClick={addContact} disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700 }}>{c.fullName}</td>
                <td style={{ color: "var(--muted)" }}>{c.email || "—"}</td>
                <td style={{ color: "var(--muted)" }}>{c.phone || "—"}</td>
                <td>
                  <button className="btn btnDanger" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)", padding: 14 }}>
                  No contacts yet. Add your first lead.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
