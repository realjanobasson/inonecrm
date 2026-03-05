import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { PaywallBanner } from "../components/PaywallBanner";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/useSession";

export default function Inbox() {
  const { session, loading } = useRequireAuth();
  const tenantId = session?.tenant.id || "";

  const [paywalled, setPaywalled] = useState("");
  const [convos, setConvos] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [draft, setDraft] = useState("");

  async function loadConvos() {
    if (!tenantId) return;
    setPaywalled("");
    const res = await apiFetch<any>(`/tenants/${tenantId}/conversations`);
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setConvos(res.data.items);
    if (!activeId && res.data.items[0]?.id) setActiveId(res.data.items[0].id);
  }

  async function loadMsgs(convoId: string) {
    if (!tenantId || !convoId) return;
    const res = await apiFetch<any>(`/tenants/${tenantId}/conversations/${convoId}/messages`);
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setMsgs(res.data.items);
  }

  useEffect(() => {
    if (!tenantId) return;
    loadConvos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    if (!activeId) return;
    loadMsgs(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const active = useMemo(() => convos.find((c) => c.id === activeId), [convos, activeId]);

  async function send() {
    if (!draft.trim() || !activeId) return;
    const res = await apiFetch<any>(`/tenants/${tenantId}/conversations/${activeId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: draft }),
    });
    if (!res.ok) {
      if (res.status === 402) setPaywalled(res.data?.message || "Trial expired");
      return;
    }
    setDraft("");
    await loadMsgs(activeId);
    await loadConvos();
  }

  async function createDemo() {
    const res = await apiFetch<any>(`/tenants/${tenantId}/conversations/demo`, { method: "POST" });
    if (res.ok) {
      await loadConvos();
    }
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
    <Layout title="Inbox">
      {paywalled ? <PaywallBanner message={paywalled} /> : null}

      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card" style={{ gridColumn: "span 4", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Conversations</div>
            <button className="btn btnPrimary" onClick={createDemo}>Demo</button>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
            {convos.length === 0 ? (
              <div style={{ padding: 12, color: "var(--muted)", fontSize: 13 }}>
                No conversations yet. Click <b>Demo</b> to generate one.
              </div>
            ) : null}
            {convos.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 12,
                  border: 0,
                  borderTop: "1px solid rgba(255,255,255,.06)",
                  cursor: "pointer",
                  background: c.id === activeId ? "rgba(69,209,213,.10)" : "transparent",
                  color: "inherit",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>{c.primaryChannel.toUpperCase()} • {c.status}</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Unread: {c.unreadCount}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 8", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{active ? "Thread" : "Select a conversation"}</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                {active ? `Channel: ${active.primaryChannel}` : ""}
              </div>
            </div>
            <button className="btn" onClick={() => activeId && loadMsgs(activeId)}>Refresh</button>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: 12, height: 420, overflowY: "auto" }}>
            {msgs.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>No messages.</div>
            ) : null}
            <div style={{ display: "grid", gap: 10 }}>
              {msgs.map((m) => (
                <div
                  key={m.id}
                  style={{
                    maxWidth: "84%",
                    justifySelf: m.direction === "out" ? "end" : "start",
                    background: m.direction === "out" ? "rgba(69,209,213,.12)" : "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 14,
                    padding: 10,
                  }}
                >
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.body}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: 12, display: "flex", gap: 10 }}>
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
            <button className="btn btnPrimary" onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
