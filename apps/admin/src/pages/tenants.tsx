import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";
import { useRequireSuperadmin } from "../lib/useSession";

export default function Tenants() {
  const { loading } = useRequireSuperadmin();
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const res = await apiFetch<any>("/admin/tenants");
    if (res.ok) setItems(res.data.items);
  }

  useEffect(() => {
    if (loading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function patch(id: string, data: any) {
    await apiFetch<any>(`/admin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) });
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
    <Layout title="Tenants">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Trial ends</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => {
              const trialDate = t.trialEndsAt ? new Date(t.trialEndsAt).toISOString().slice(0, 10) : "";
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 800 }}>{t.name}</td>
                  <td style={{ color: "var(--muted)" }}>{t.slug}</td>
                  <td>
                    <select className="input" value={t.plan} onChange={(e) => patch(t.id, { plan: e.target.value })}>
                      <option value="trial">trial</option>
                      <option value="pro">pro</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                  </td>
                  <td>
                    <select className="input" value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}>
                      <option value="active">active</option>
                      <option value="locked">locked</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      type="date"
                      defaultValue={trialDate}
                      onBlur={(e) => {
                        const v = e.target.value;
                        patch(t.id, { trialEndsAt: v ? new Date(v + "T00:00:00Z").getTime() : null });
                      }}
                    />
                  </td>
                  <td>
                    <button className="btn" onClick={() => patch(t.id, { trialEndsAt: Date.now() + 7 * 86400000, plan: "trial", status: "active" })}>
                      Reset trial
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 14, color: "var(--muted)" }}>
                  No tenants yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
