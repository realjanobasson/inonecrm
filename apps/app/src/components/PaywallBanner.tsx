import Link from "next/link";

export function PaywallBanner({ message }: { message: string }) {
  return (
    <div className="card" style={{ borderColor: "rgba(239,68,68,.35)", background: "rgba(239,68,68,.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="cardTitle" style={{ color: "rgba(255,255,255,.85)" }}>Upgrade required</div>
          <div style={{ color: "rgba(255,255,255,.92)", fontSize: 14, lineHeight: 1.5 }}>{message}</div>
        </div>
        <Link href="/billing" className="btn btnPrimary">
          Upgrade now
        </Link>
      </div>
    </div>
  );
}
