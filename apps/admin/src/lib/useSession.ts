import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "./api";

export function useRequireSuperadmin() {
  const r = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiFetch<any>("/auth/me");
      if (!mounted) return;
      if (!res.ok || res.data.user?.role !== "superadmin") {
        setLoading(false);
        r.replace("/login");
        return;
      }
      setUser(res.data.user);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [r]);

  return { loading, user };
}
