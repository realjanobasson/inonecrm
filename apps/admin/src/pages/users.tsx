import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { apiFetch } from "../lib/api";
import { useRequireSuperadmin } from "../lib/useSession";

export default function Users() {
  const { loading } = useRequireSuperadmin();
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const res = await apiFetch<any>("/admin/users");
    if (res.ok) setItems(res.data.items);
  }

  useEffect(() => {
    if (loading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function patch(id: string, data: any) {
    await apiFetch<any>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
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
    <Layout title="Users">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 800 }}>{u.email}</td>
                <td style={{ color: "var(--muted)" }}>{u.name}</td>
                <td>
                  <select className="input" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>
                    <option value="member">member</option>
                    <option value="org_admin">org_admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                </td>
                <td>
                  <select
                    className="input"
                    value={u.isActive ? "1" : "0"}
                    onChange={(e) => patch(u.id, { isActive: e.target.value === "1" })}
                  >
                    <option value="1">active</option>
                    <option value="0">disabled</option>
                  </select>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 14, color: "var(--muted)" }}>
                  No users yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
