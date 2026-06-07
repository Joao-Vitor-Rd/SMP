"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Mail } from "lucide-react";

type FeedbackPopup = {
    type: "warning" | "success";
    title: string;
    message: string;
};

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
    if (!domainPart.includes(".")) return "O domínio do e-mail precisa conter pelo menos um ponto, como .com ou .br.";
    const domainLabels = domainPart.split(".");
    if (domainLabels.some((label) => !label)) return "O domínio do e-mail contém partes vazias. Revise o endereço.";
    if (domainLabels.some((label) => label.startsWith("-") || label.endsWith("-"))) return "O domínio do e-mail não pode começar ou terminar com hífen.";
    const topLevelDomain = domainLabels[domainLabels.length - 1];
    if (!/^[a-z]{2,}$/i.test(topLevelDomain)) return "O final do domínio parece inválido. Use algo como .com, .com.br ou .gov.br.";
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)) return "A parte antes do @ contém caracteres inválidos.";
    return null;
}

export default function RecuperarSenhaPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState("");
    const [popup, setPopup] = useState<FeedbackPopup | null>(null);

    // Pega a URL do back-end que estava no seu arquivo de configuração
	const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    function showPopup(nextPopup: FeedbackPopup) {
        setPopup(nextPopup);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErro("");
        setSucesso(false);

        const normalizedEmail = email.trim().toLowerCase();
        const emailValidationError = getEmailValidationError(normalizedEmail);

        if (emailValidationError) {
            showPopup({
                type: "warning",
                title: "E-mail inválido",
                message: emailValidationError,
            });
            return;
        }

        setEnviando(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/password-reset/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            if (!response.ok) {
                throw new Error("Erro no servidor");
            }

            const data = await response.json(); 

            setEmail(normalizedEmail);
            setSucesso(true);
            showPopup({
                type: "success",
                title: "Link enviado",
                message: data.message || "Se a conta estiver ativa e o e-mail existir no sistema, um link de redefinição será enviado com validade de 2 horas.",
            });
        } catch {
            const message = "Não foi possível enviar o link de recuperação. Tente novamente.";
            setErro(message);
            showPopup({
                type: "warning",
                title: "Falha no envio",
                message,
            });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(22,93,122,0.18),transparent_32%),linear-gradient(180deg,#f8fbfd_0%,#eef4f8_100%)] px-4 py-8 flex items-center justify-center">
            <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
                <div className="bg-linear-to-br from-[#165D7A] to-[#2F6E8E] px-8 py-10 text-center text-white">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M4 12h4l3 7 5-14 4 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Recuperar Senha</h1>
                    <p className="mt-2 text-sm text-white/75">Digite seu e-mail para receber o link de redefinição.</p>
                </div>

                <div className="px-8 py-8">
                    {popup && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
                            <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
                                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${popup.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    {popup.type === "success" ? <CheckCircle2 size={24} /> : <Clock3 size={24} />}
                                </div>
                                <h2 className="mt-4 text-center text-xl font-black text-slate-950">{popup.title}</h2>
                                <p className="mt-3 text-center text-sm leading-6 text-slate-600">{popup.message}</p>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPopup(null)}
                                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                                    >
                                        Entendi
                                    </button>
                                    {popup.type === "success" && (
                                        <button
                                            type="button"
                                            onClick={() => router.push("/login")}
                                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#165D7A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#123f53]"
                                        >
                                            Ir para o login
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {erro && (
                        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {erro}
                        </div>
                    )}

                    {sucesso ? (
                        <div className="space-y-5 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <CheckCircle2 size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Link enviado</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Se o e-mail estiver ativo no sistema, você receberá um link para redefinição com validade de 2 horas.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
                                <p className="font-bold text-slate-900">Regras importantes</p>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex gap-2"><Clock3 size={16} className="mt-0.5 shrink-0 text-[#165D7A]" /> O link expira em 2 horas.</li>
                                    <li className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#165D7A]" /> A nova senha segue as mesmas regras de complexidade do cadastro.</li>
                                    <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-[#165D7A]" /> Use o e-mail da conta ativa cadastrada no sistema.</li>
                                </ul>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push("/login")}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                            >
                                <ArrowLeft size={16} /> Voltar para o login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">Email</label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        inputMode="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value);
                                            setPopup(null);
                                            setErro("");
                                        }}
                                        placeholder="seu@email.com"
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