import { getToken } from "./auth";

function apiBase() {
  // Set NEXT_PUBLIC_API_BASE in Cloudflare Pages env. Example: https://api.inonecrm.com
  return process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8787";
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; status: number; data: any }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiBase() + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, data };
}
