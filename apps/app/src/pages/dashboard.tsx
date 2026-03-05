import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { PaywallBanner } from "../components/PaywallBanner";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/useSession";

export default function Dashboard() {
  const { session, loading } = useRequireAuth();
  const [counts, setCounts] = useState<{ contacts: number; deals: number; tasks: number } | null>(null);
  const [paywalled, setPaywalled] = useState<string>("");

  const tenantId = session?.tenant.id || "";

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    (async () => {
      setPaywalled("");
      const [c, d, t] = await Promise.all([
        apiFetch<any>(`/tenants/${tenantId}/contacts`),
        apiFetch<any>(`/tenants/${tenantId}/opportunities`),
        apiFetch<any>(`/tenants/${tenantId}/tasks`),
      ]);

      const anyPaywall = [c, d, t].find((x) => !x.ok && x.status === 402) as any;
      if (anyPaywall && mounted) {
        setPaywalled(anyPaywall.data?.message || "Trial expired.");
        return;
      }

      if (mounted && c.ok && d.ok && t.ok) {
        setCounts({ contacts: c.data.items.length, deals: d.data.items.length, tasks: t.data.items.length });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const trialLabel = useMemo(() => {
    const ends = session?.tenant.trialEndsAt;
    if (!ends) return "";
    const days = Math.max(0, Math.ceil((ends - Date.now()) / (24 * 60 * 60 * 1000)));
    return session?.tenant.plan === "trial" ? `${days} day(s) left in trial` : "Active";
  }, [session?.tenant.plan, session?.tenant.trialEndsAt]);

  if (loading) {
    return (
      <main className="authWrap">
        <div className="authCard">
          <h1 className="authTitle">Loading…</h1>
          <p className="authSub">Preparing your workspace.</p>
        </div>
      </main>
    );
  }

  return (
    <Layout title="Dashboard">
      {paywalled ? <PaywallBanner message={paywalled} /> : null}

      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="cardTitle">Workspace</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{session?.tenant.name}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="badge badgeAccent">{session?.tenant.plan.toUpperCase()}</span>
            {trialLabel ? <span className="badge">{trialLabel}</span> : null}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 8" }}>
          <div className="cardTitle">Today’s focus</div>
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>
            Capture → Reply → Follow up → Close
          </div>
          <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.5 }}>
            InOneCRM is wired for WhatsApp-style speed. Create contacts, move deals, and keep follow-ups tight.
          </p>
        </div>

        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="cardTitle">Contacts</div>
          <div className="cardValue">{counts ? counts.contacts : "—"}</div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="cardTitle">Open deals</div>
          <div className="cardValue">{counts ? counts.deals : "—"}</div>
        </div>
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="cardTitle">Tasks</div>
          <div className="cardValue">{counts ? counts.tasks : "—"}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardTitle">First activation goal</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>1 lead captured + 1 auto follow-up sent</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, fontSize: 13 }}>
          Start by adding a contact, then create a deal in Pipeline. Tasks keep your response SLAs tight.
        </div>
      </div>
    </Layout>
  );
}
