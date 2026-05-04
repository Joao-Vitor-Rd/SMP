"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token_acesso");
    router.replace(token ? "/editar-perfil" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm shadow-2xl backdrop-blur">
        Redirecionando...
      </div>
    </div>
  );
}
