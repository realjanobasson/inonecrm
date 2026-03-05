import { useEffect } from "react";
import { useRouter } from "next/router";
import { getToken } from "../lib/auth";

export default function Home() {
  const r = useRouter();
  useEffect(() => {
    if (getToken()) r.replace("/dashboard");
    else r.replace("/login");
  }, [r]);

  return (
    <main className="authWrap">
      <div className="authCard">
        <h1 className="authTitle">Loading…</h1>
        <p className="authSub">Redirecting to your workspace.</p>
      </div>
    </main>
  );
}
