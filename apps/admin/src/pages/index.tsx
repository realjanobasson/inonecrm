import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const r = useRouter();
  useEffect(() => {
    r.replace("/tenants");
  }, [r]);

  return (
    <main className="authWrap">
      <div className="authCard">
        <h1 className="authTitle">Loading…</h1>
        <p className="authSub">Redirecting.</p>
      </div>
    </main>
  );
}
