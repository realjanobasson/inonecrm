import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { getTenantId, setSession } from "./auth";
import { useRouter } from "next/router";

export type Session = {
  user: { id: string; email: string; name: string; role: string };
  tenant: { id: string; name: string; slug: string; plan: string; status: string; trialEndsAt?: number | null };
};

export function useRequireAuth() {
  const r = useRouter();
  const [session, setSess] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiFetch<{ ok: true; user: any; tenant: any }>("/auth/me");
      if (!mounted) return;
      if (!res.ok) {
        setLoading(false);
        r.replace("/login");
        return;
      }
      setSess({ user: res.data.user, tenant: res.data.tenant });
      // ensure tenantId is stored for convenience
      if (!getTenantId()) setSession(localStorage.getItem("inonecrm_token") || "", res.data.tenant.id);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [r]);

  return { session, loading };
}
