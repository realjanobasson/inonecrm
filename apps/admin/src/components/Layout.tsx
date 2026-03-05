import Link from "next/link";
import { useRouter } from "next/router";
import { clearToken } from "../lib/auth";

export function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  const r = useRouter();
  const path = r.pathname;

  const nav = [
    { href: "/tenants", label: "Tenants" },
    { href: "/users", label: "Users" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: 10 }}>
          <div style={{ fontWeight: 900 }}>InOneCRM</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Admin</div>
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
              clearToken();
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
          <span className="badge badgeAccent">superadmin</span>
        </div>
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
