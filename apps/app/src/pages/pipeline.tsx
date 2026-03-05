import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { PaywallBanner } from "../components/PaywallBanner";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/useSession";

export default function Pipeline() {
  const { session, loading } = useRequireAuth();
  const tenantId = session?.tenant.id || "";

  const [paywalled, setPaywalled] = useState("");
  const [pipe, setPipe] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newContactId, setNewContactId] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    if (!tenantId) return;
    setPaywalled("");

    const p = await apiFetch<any>(`/tenants/${tenantId}/pipelines/default`);
    if (!p.ok) {
      if (p.status === 402) setPaywalled(p.data?.message || "Trial expired");
      return;
    }
    setPipe(p.data.pipeline);
    setStages(p.data.stages);

    const [d, c] = await Promise.all([
      apiFetch<any>(`/tenants/${tenantId}/opportunities?pipelineId=${encodeURIComponent(p.data.pipeline.id)}`),
      apiFetch<any>(`/tenants/${tenantId}/contacts`),
    ]);

    const anyPay = [d, c].find((x) => !x.ok && x.status === 402) as any;
    if (anyPay) {
      setPaywalled(anyPay.data?.message || "Trial expired");
      return;
    }

    if (d.ok) setDeals(d.data.items);
    if (c.ok) setContacts(c.data.items);
  }

  useEffect(() => {
    if (!tenantId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const byStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const d of deals) (map[d.stageId] ||= []).push(d);
    return map;
  }, [stages, deals]);

  async function addDeal() {
    if (!tenantId || !pipe || !stages.length) return;
    if (!newContactId) return alert("Pick a contact first");

    setBusy(true);
    const res = await apiFetch<any>(`/tenants/${tenantId}/opportunities`, {
      method: "POST",
      body: JSON.stringify({
        contactId: newContactId,
        pipelineId: pipe.id,
        stageId: stages[0].id,
        title: newTitle || "New deal",
        valueCents: 0,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setNewTitle("");
    await loadAll();
  }

  async function move(dealId: string, dir: -1 | 1, currentStageId: string) {
    const idx = stages.findIndex((s) => s.id === currentStageId);
    const next = stages[idx + dir];
    if (!next) return;

    await apiFetch<any>(`/tenants/${tenantId}/opportunities/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify({ stageId: next.id }),
    });
    await loadAll();
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
    <Layout title="Pipeline">
      {paywalled ? <PaywallBanner message={paywalled} /> : null}

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select className="input" value={newContactId} onChange={(e) => setNewContactId(e.target.value)} style={{ width: 260 }}>
            <option value="">Select contact…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
          <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Deal title (optional)" style={{ width: 280 }} />
          <button className="btn btnPrimary" onClick={addDeal} disabled={busy}>
            {busy ? "Adding…" : "Add deal"}
          </button>
          <button className="btn" onClick={loadAll}>Refresh</button>
        </div>
        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
          Move deals stage-by-stage to enforce your team’s process. (Drag & drop can be added next.)
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: `repeat(${Math.max(3, stages.length)}, minmax(240px, 1fr))`, gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {stages.map((s) => (
          <div key={s.id} className="card" style={{ minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>{s.name}</div>
              <span className="badge">{(byStage[s.id] || []).length}</span>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {(byStage[s.id] || []).map((d) => (
                <div key={d.id} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 10, background: "rgba(0,0,0,.12)" }}>
                  <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{d.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>Value: {((d.valueCents || 0) / 100).toFixed(2)} {d.currency}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn" onClick={() => move(d.id, -1, s.id)} disabled={stages[0]?.id === s.id}>
                      ←
                    </button>
                    <button className="btn" onClick={() => move(d.id, 1, s.id)} disabled={stages[stages.length - 1]?.id === s.id}>
                      →
                    </button>
                  </div>
                </div>
              ))}
              {(byStage[s.id] || []).length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>No deals here yet.</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
