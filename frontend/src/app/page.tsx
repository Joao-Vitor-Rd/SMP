"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Tentar acessar o endpoint /auth/me para verificar autenticação
        const res = await fetch("http://localhost:8000/auth/me", {
          credentials: "include",  // Incluir cookies na requisição
        });
        
        if (res.ok) {
          // Usuário autenticado, redirecionar para editar-perfil
          router.replace("/editar-perfil");
        } else {
          // Não autenticado, ir para login
          router.replace("/login");
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        // Em caso de erro, redirecionar para login
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm shadow-2xl backdrop-blur">
        Redirecionando...
      </div>
    </div>
  );
}
