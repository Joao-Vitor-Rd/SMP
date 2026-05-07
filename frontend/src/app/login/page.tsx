"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
const SuccessPopup = dynamic(() => import("../../../components/SuccessPopup"), { ssr: false });
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { getPublicApiBaseUrl } from "../../lib/authApi";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const res = await fetch(`${getPublicApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, lembrar_me: lembrarMe }),
      });

      if (res.status === 401) {
        setErro("Credenciais inválidas. Verifique seu e-mail e senha.");
        return;
      }

      if (!res.ok) {
        setErro("Erro ao conectar com o servidor. Tente novamente.");
        return;
      }

      const data = await res.json();

      localStorage.setItem("token_acesso", data.token_acesso);
      localStorage.setItem("token_atualizacao", data.token_atualizacao);
      if (data.usuario) {
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push("/editar-perfil");
      }, 2000);
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique sua conexão.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4">
      {showSuccess && (
        <SuccessPopup message="Login realizado com sucesso!" onClose={() => setShowSuccess(false)} />
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md px-4 sm:px-10 py-10 sm:py-12 relative transition-shadow">

        {/* Header */}
        <div className="flex flex-col items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#165D7A] rounded-xl w-12 h-12 flex items-center justify-center shadow-md">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12h4l3 7 5-14 4 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-[24px] leading-8 text-[#101828]">RoadSense AI</h1>
              <p className="font-normal text-[14px] leading-5 text-[#4A5565]">Análise Inteligente de Pavimentos</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-[24px] leading-8 text-[#101828] mb-1">Bem-vindo</h2>
          <p className="font-normal text-[16px] leading-6 text-[#4A5565]">Entre com suas credenciais</p>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center flex items-center justify-center gap-2">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">

          {/* E-mail */}
          <div>
            <label className="block text-sm font-semibold text-[#1A2B3D] mb-1 ml-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full pl-11 pr-4 py-3 border border-[#D6E0E9] rounded-lg text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#165D7A] focus:border-transparent shadow-sm transition-all duration-150 focus:shadow-lg"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-semibold text-[#1A2B3D] mb-1 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-10 py-3 border border-[#D6E0E9] rounded-lg text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#165D7A] focus:border-transparent shadow-sm transition-all duration-150 focus:shadow-lg"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Lembrar-me / Esqueceu a senha */}
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lembrarMe}
                onChange={(e) => setLembrarMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#165D7A] focus:ring-[#165D7A] accent-[#165D7A]"
              />
              <span className="text-sm text-gray-600">Lembrar-me</span>
            </label>
            <a href="#" className="text-sm text-[#165D7A] hover:underline font-semibold">
              Esqueceu a senha?
            </a>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-linear-to-r from-[#165D7A] to-[#1A2B3D] hover:from-[#1A2B3D] hover:to-[#165D7A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-base transition-all duration-150 shadow-lg mt-4 cursor-pointer"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Rodapé */}
        <p className="mt-10 text-center text-sm text-gray-500">
          Não tem uma conta?{' '}
          <a href="/cadastro" className="text-[#165D7A] font-bold hover:underline cursor-pointer">
            Cadastre-se
          </a>
        </p>

      </div>
    </div>
  );
}
