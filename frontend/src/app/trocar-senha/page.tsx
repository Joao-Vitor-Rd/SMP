"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

function TrocarSenhaContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [alerta, setAlerta] = useState<{ tipo: "error" | "warning"; mensagem: string } | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const temMinimo = senha.length >= 8;
    const temNumero = /\d/.test(senha);
    const temMaiuscula = /[A-Z]/.test(senha);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAlerta(null);

        if (!token) {
            setAlerta({
                tipo: "error",
                mensagem: "O link de recuperação parece inválido ou expirado. Volte e solicite um novo e-mail.",
            });
            return;
        }

        if (senha !== confirmarSenha) {
            setAlerta({
                tipo: "warning",
                mensagem: "A confirmação de senha não confere com a nova senha digitada.",
            });
            return;
        }

        if (!temMinimo || !temNumero || !temMaiuscula) {
            setAlerta({
                tipo: "warning",
                mensagem: "A senha precisa atender a todos os requisitos mínimos de segurança.",
            });
            return;
        }

        setEnviando(true);

        try {
            const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    token: token,
                    nova_senha: senha 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || "Erro ao redefinir senha");
            }

            setSucesso(true);
        } catch (error: unknown) {
            let message = "Não foi possível alterar a senha.";
            if (error instanceof Error) {
                message = error.message;
            }
            setAlerta({ tipo: "error", mensagem: message });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(22,93,122,0.18),transparent_32%),linear-gradient(180deg,#f8fbfd_0%,#eef4f8_100%)] px-4 py-8 flex items-center justify-center">
            <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
                <div className="bg-linear-to-br from-[#165D7A] to-[#2F6E8E] px-8 py-10 text-center text-white">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner">
                        <Lock width="28" height="28" stroke="#fff" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Nova Senha</h1>
                    <p className="mt-2 text-sm text-white/75">Crie uma nova senha segura para sua conta.</p>
                </div>

                <div className="px-8 py-8">
                    {alerta && (
                        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm flex gap-2 items-start ${
                            alerta.tipo === "error" 
                                ? "border-red-200 bg-red-50 text-red-700" 
                                : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}>
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <div>{alerta.mensagem}</div>
                        </div>
                    )}

                    {sucesso ? (
                        <div className="space-y-5 text-center py-4">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <CheckCircle2 size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Senha alterada!</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Sua senha foi atualizada com sucesso. Você já pode acessar sua conta normalmente.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push("/login")}
                                className="w-full rounded-xl bg-[#165D7A] px-5 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#123f53]"
                            >
                                Fazer Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={mostrarSenha ? "text" : "password"}
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-base text-slate-900 outline-none transition focus:border-[#165D7A] focus:ring-4 focus:ring-cyan-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarSenha(!mostrarSenha)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">Confirmar Senha</label>
                                <div className="relative">
                                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={mostrarSenha ? "text" : "password"}
                                        value={confirmarSenha}
                                        onChange={(e) => setConfirmarSenha(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-base text-slate-900 outline-none transition focus:border-[#165D7A] focus:ring-4 focus:ring-cyan-100"
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Requisitos da Senha</p>
                                <ul className="space-y-2">
                                    <li className={`flex items-center gap-2 text-xs ${temMinimo ? "text-emerald-600" : "text-slate-500"}`}>
                                        <CheckCircle2 size={14} /> Mínimo de 8 caracteres
                                    </li>
                                    <li className={`flex items-center gap-2 text-xs ${temMaiuscula ? "text-emerald-600" : "text-slate-500"}`}>
                                        <CheckCircle2 size={14} /> Pelo menos uma letra maiúscula
                                    </li>
                                    <li className={`flex items-center gap-2 text-xs ${temNumero ? "text-emerald-600" : "text-slate-500"}`}>
                                        <CheckCircle2 size={14} /> Pelo menos um número
                                    </li>
                                </ul>
                            </div>

                            <button
                                type="submit"
                                disabled={enviando}
                                className="w-full rounded-xl bg-linear-to-r from-[#165D7A] to-[#1A2B3D] px-5 py-3 text-base font-bold text-white shadow-lg transition hover:from-[#1A2B3D] hover:to-[#165D7A] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {enviando ? "Atualizando..." : "Redefinir Senha"}
                            </button>

                            <div className="flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => router.push("/login")}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#165D7A] hover:underline"
                                >
                                    <ArrowLeft size={16} /> Cancelar e voltar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TrocarSenhaPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f8fbfd]">
                <div className="animate-pulse text-[#165D7A] font-bold">Carregando...</div>
            </div>
        }>
            <TrocarSenhaContent />
        </Suspense>
    );
}