import Link from "next/link";
import { useRouter } from "next/router";
import { clearSession } from "../lib/auth";

export function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  const r = useRouter();
  const path = r.pathname;

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/contacts", label: "Contacts" },
    { href: "/pipeline", label: "Pipeline" },
    { href: "/tasks", label: "Tasks" },
    { href: "/inbox", label: "Inbox" },
    { href: "/billing", label: "Billing" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandDot" />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: ".02em" }}>InOneCRM</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>App</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 14, padding: 10 }}>
          <button
            className="btn"
            style={{ width: "100%" }}
            onClick={() => {
              clearSession();
              r.push("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>{title}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="badge badgeAccent">7-day trial flow ready</span>
          </div>
        </div>
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
