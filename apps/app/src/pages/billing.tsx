import { Layout } from "../components/Layout";
import { useRequireAuth } from "../lib/useSession";

export default function Billing() {
  const { session, loading } = useRequireAuth();

  if (loading) {
    return (
      <main className="authWrap">
        <div className="authCard">
          <h1 className="authTitle">Loading…</h1>
        </div>
      </main>
    );
  }

  const ends = session?.tenant.trialEndsAt || null;
  const days = ends ? Math.max(0, Math.ceil((ends - Date.now()) / (24 * 60 * 60 * 1000))) : null;
  const expired = session?.tenant.plan === "trial" && ends && Date.now() > ends;

  return (
    <Layout title="Billing">
      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardTitle">Current plan</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className="badge badgeAccent">{session?.tenant.plan.toUpperCase()}</span>
          {days !== null ? <span className="badge">{days} day(s) left in trial</span> : null}
          {expired ? <span className="badge badgeDanger">Trial expired</span> : null}
        </div>

        <div style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.6, fontSize: 13 }}>
          After your 7-day trial, users will hit a paywall inside the app and must add card details to continue.
          Stripe checkout + subscription activation can be wired next.
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Upgrade to Full Access</div>
        <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.6, fontSize: 13 }}>
          Full Access unlocks: CRM + AI & Automation Store, unlimited contacts, pipeline automations, and AI employees add-ons.
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" onClick={() => alert("Stripe checkout wiring is next.\n\nWe will connect billing so expired trials can upgrade with card details.")}>Start upgrade</button>
          <a className="btn" href="https://inonecrm.com" target="_blank" rel="noreferrer">View pricing page</a>
        </div>
      </div>
    </Layout>
  );
}
