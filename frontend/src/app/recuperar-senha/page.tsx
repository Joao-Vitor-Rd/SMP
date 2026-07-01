"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, AlertCircle } from "lucide-react";

function getEmailValidationError(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return "Informe o e-mail da conta ativa para continuar com a recuperação de senha.";
    if (normalizedEmail.length > 254) return "O e-mail informado é muito longo. Verifique se foi digitado corretamente.";
    if (/\s/.test(normalizedEmail)) return "O e-mail não pode conter espaços.";
    const atCount = (normalizedEmail.match(/@/g) ?? []).length;
    if (atCount !== 1) return "Digite um e-mail válido com apenas um caractere @.";
    const [localPart, domainPart] = normalizedEmail.split("@");
    if (!localPart || !domainPart) return "Digite o endereço completo no formato nome@dominio.com.";
    if (localPart.startsWith(".") || localPart.endsWith(".")) return "A parte antes do @ não pode começar ou terminar com ponto.";
    if (domainPart.startsWith(".") || domainPart.endsWith(".")) return "O domínio do e-mail não pode começar ou terminar com ponto.";
    if (normalizedEmail.includes("..")) return "O e-mail não pode conter pontos consecutivos.";
    if (!domainPart.includes(".")) return "O domínio do e-mail precisa conter pelo menos um ponto, como .com ou .com.br.";
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(normalizedEmail)) return "O e-mail digitado possui caracteres inválidos no formato.";
    return null;
}

export default function RecuperarSenhaPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [alerta, setAlerta] = useState<{ tipo: "error" | "warning"; mensagem: string } | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setAlerta(null);

        const erroValidacao = getEmailValidationError(email);
        if (erroValidacao) {
            setAlerta({ tipo: "warning", mensagem: erroValidacao });
            return;
        }

        setEnviando(true);
        const normalizedEmail = email.trim().toLowerCase();

        try {
            const response = await fetch(`${API_URL}/auth/password-reset/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || "E-mail não encontrado no sistema.");
            }

            setSucesso(true);
        } catch (error: unknown) {
            let message = "Não foi possível processar a recuperação.";
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
                        <Mail width="28" height="28" stroke="#fff" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Recuperar Senha</h1>
                    <p className="mt-2 text-sm text-white/75">Insira seu e-mail para receber as instruções.</p>
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
                                <h2 className="text-xl font-black text-slate-950">E-mail enviado!</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    As instruções de redefinição de senha foram enviadas para <strong className="text-slate-900">{email.trim().toLowerCase()}</strong>. Verifique sua caixa de entrada e de spam.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push("/login")}
                                className="w-full rounded-xl bg-[#165D7A] px-5 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#123f53]"
                            >
                                Voltar para o Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">E-mail</label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu.nome@empresa.com"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-base text-slate-900 outline-none transition focus:border-[#165D7A] focus:ring-4 focus:ring-cyan-100"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={enviando}
                                className="w-full rounded-xl bg-linear-to-r from-[#165D7A] to-[#1A2B3D] px-5 py-3 text-base font-bold text-white shadow-lg transition hover:from-[#1A2B3D] hover:to-[#165D7A] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {enviando ? "Enviando..." : "Enviar link de recuperação"}
                            </button>

                            <div className="flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => router.push("/login")}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#165D7A] hover:underline"
                                >
                                    <ArrowLeft size={16} /> Voltar para o login
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}