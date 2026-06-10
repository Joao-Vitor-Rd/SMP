/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    LogOut,
    Plus,
    Settings,
    User,
    Calendar,
    FileText
} from "lucide-react";

import { clearAuthSession, authApi } from "../../lib/authApi";
import AppSidebar from "../../../components/AppSidebar";

type CargoUsuario = "supervisor" | "tecnico" | "colaborador" | "";

type UsuarioStorage = {
    id?: number;
    nome?: string;
    username?: string;
    crea?: string | null;
    cft?: string | null;
    identificador_profissional?: string | null;
    cargo?: CargoUsuario | string;
};

type LaudoResponse = {
    id: number;
    data: string;
    responsavel: string;
    credencial_responsavel: string;
    resumo: Record<string, number>;
    usuarios: Array<{ nome: string; cargo: string }>;
};

type ColaboradorResponse = {
    id: number;
    nome: string;
    cargo: string;
    email: string;
};

type InspectionDraftStorage = {
    inspectionDate: string;
    responsibleName: string;
    responsibleIdentifier: string;
    selectedCollaboratorIds: string[];
    savedAt: string;
};

const INSPECTION_METADATA_KEY = "smp:us13-inspection-metadata";
const INSPECTION_DRAFT_KEY = "smp:us13-inspection-draft";

function canUseStorage() {
    return typeof window !== "undefined";
}

function parseJson<T>(value: string | null) {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function getInitialUserState() {
    if (!canUseStorage()) {
        return { id: undefined, nome: "Engenheiro(a)", cargo: "Engenheiro" };
    }

    const usuario = parseJson<UsuarioStorage>(window.localStorage.getItem("usuario"));
    const nomeExibicao = usuario?.nome?.trim() || usuario?.username?.trim() || "Engenheiro(a)";

    return {
        id: usuario?.id,
        nome: nomeExibicao,
        cargo: usuario?.cargo === "supervisor" ? "Supervisor" : usuario?.cargo === "tecnico" ? "Técnico" : "Colaborador",
    };
}

function getInitialInspectionState(userName: string) {
    if (!canUseStorage()) {
        return {
            inspectionDate: "",
            responsibleName: userName,
            responsibleIdentifier: "",
            selectedCollaboratorIds: [] as string[],
            metadataDetected: false,
        };
    }

    const metadata = parseJson<{ inspectionDate?: string; dataInspecao?: string; date?: string }>(window.sessionStorage.getItem(INSPECTION_METADATA_KEY));
    const draft = parseJson<InspectionDraftStorage>(window.sessionStorage.getItem(INSPECTION_DRAFT_KEY));
    const metadataDate = formatDateForInput(metadata?.inspectionDate ?? metadata?.dataInspecao ?? metadata?.date ?? null);

    const usuarioRaw = parseJson<UsuarioStorage>(window.localStorage.getItem("usuario"));
    const credencialPadrao = usuarioRaw?.crea || usuarioRaw?.cft || usuarioRaw?.identificador_profissional || "";

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataLocalString = `${ano}-${mes}-${dia}`; 

    return {
        inspectionDate: metadataDate || draft?.inspectionDate || dataLocalString,
        responsibleName: draft?.responsibleName || userName,
        responsibleIdentifier: draft?.responsibleIdentifier || credencialPadrao,
        selectedCollaboratorIds: draft?.selectedCollaboratorIds || [],
        metadataDetected: Boolean(metadataDate),
    };
}

function formatDateForInput(value?: string | null) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function formatDateForDisplay(value: string) {
    if (!value) return "Pendente";

    const apenasData = value.substring(0, 10);
    const partes = apenasData.split("-");
    
    if (partes.length === 3) {
        const ano = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const dia = parseInt(partes[2], 10);
        
        const parsed = new Date(ano, mes, dia, 12, 0, 0);
        if (!Number.isNaN(parsed.getTime())) {
            const mesExtenso = parsed.toLocaleDateString("pt-BR", { month: "long" });
            return `${dia} de ${mesExtenso} de ${ano}`;
        }
    }

    const parsedFallback = new Date(value);
    if (!Number.isNaN(parsedFallback.getTime())) {
        return parsedFallback.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    }

    return value;
}

export default function MeusTrabalhosPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [showPopUp, setShowPopUp] = useState(false);
    const [showNovaInspecao, setShowNovaInspecao] = useState(false);
    
    const [laudos, setLaudos] = useState<LaudoResponse[]>([]);
    const [colaboradores, setColaboradores] = useState<ColaboradorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const [initialUserState] = useState(() => getInitialUserState());
    const [initialInspectionState] = useState(() => getInitialInspectionState(initialUserState.nome));
    const [usuarioNome] = useState(initialUserState.nome);
    const [cargoUsuario] = useState(initialUserState.cargo);
    const [inspectionDate, setInspectionDate] = useState(initialInspectionState.inspectionDate);
    const [responsibleName, setResponsibleName] = useState(initialInspectionState.responsibleName);
    const [responsibleIdentifier, setResponsibleIdentifier] = useState(initialInspectionState.responsibleIdentifier);
    const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>(initialInspectionState.selectedCollaboratorIds);
    const [feedback, setFeedback] = useState<{ type: "success" | "warning"; message: string } | null>(null);
    const [metadataDetected, setMetadataDetected] = useState(initialInspectionState.metadataDetected);

    useEffect(() => {
        let isMounted = true;

        async function carregarDadosDoServidor() {
            try {
                const [resLaudos, resColabs] = await Promise.all([
                    authApi.get<LaudoResponse[]>("/api/laudos/"),
                    authApi.get<ColaboradorResponse[]>("/api/supervisores/me/colaboradores").catch(() => ({ data: [] }))
                ]);

                if (!isMounted) return;

                if (Array.isArray(resLaudos.data)) {
                    const ordenados = resLaudos.data.sort((a, b) => b.id - a.id);
                    setLaudos(ordenados);
                }

                if (Array.isArray(resColabs.data)) {
                    setColaboradores(resColabs.data);
                }
            } catch (error) {
                console.error("Erro ao carregar dados da API:", error);
                setFeedback({ type: "warning", message: "Não foi possível sincronizar os trabalhos com o servidor." });
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        carregarDadosDoServidor();
        return () => { isMounted = false; };
    }, []);

    const summaryCards = [
        { label: "Trabalhos em andamento", value: String(laudos.length), tone: "blue" },
        { label: "Inspeções concluídas", value: "0", tone: "emerald" },
        { label: "Nova inspeção", value: selectedCollaboratorIds.length ? `${selectedCollaboratorIds.length} colaborador(es)` : "Aguardando abertura", tone: "slate" },
    ] as const;

    function handleLogout() {
        clearAuthSession();
        router.push("/login");
    }

    function toneClasses(tone: "slate" | "blue" | "emerald") {
        if (tone === "blue") return "border-blue-100 bg-blue-50 text-blue-900";
        if (tone === "emerald") return "border-emerald-100 bg-emerald-50 text-emerald-900";
        return "border-slate-200 bg-white text-slate-900";
    }

    async function handleCreateInspection() {
        if (!inspectionDate) {
            setFeedback({ type: "warning", message: "Selecione uma data válida para prosseguir." });
            return;
        }

        if (!responsibleName.trim()) {
            setFeedback({ type: "warning", message: "Informe o nome do responsável técnico." });
            return;
        }

        setSalvando(true);

        try {
            const colabsIdsNumericos = selectedCollaboratorIds.map(Number);

            const payloadBackend = {
                data: inspectionDate, 
                responsavel: responsibleName,
                credencial_responsavel: responsibleIdentifier || "N/A",
                colaboradores_ids: colabsIdsNumericos, 
                resumo: {} 
            };

            console.log("Enviando Payload ao Servidor:", payloadBackend);

            const response = await authApi.post<LaudoResponse>("/api/laudos/", payloadBackend);
            const novoLaudoId = response.data.id;

            if (canUseStorage()) {
                const payloadStorage: InspectionDraftStorage = {
                    inspectionDate,
                    responsibleName,
                    responsibleIdentifier,
                    selectedCollaboratorIds,
                    savedAt: new Date().toISOString(),
                };

                window.sessionStorage.setItem(INSPECTION_DRAFT_KEY, JSON.stringify(payloadStorage));
                window.sessionStorage.setItem(
                    INSPECTION_METADATA_KEY,
                    JSON.stringify({ inspectionDate, dataInspecao: inspectionDate, date: inspectionDate })
                );
            }

            setShowNovaInspecao(false);
            setFeedback({ type: "success", message: "Inspeção criada! Seguindo para envio das mídias..." });
            
            router.push(`/upload-imagens?laudoId=${novoLaudoId}`);
        } catch (error: unknown) {
            console.error("=== DIAGNÓSTICO DO ERRO 400 ===");
            
            let detalheServidor = "";

            // Importe o axios no topo do seu arquivo se já não estiver importado: import axios from "axios";
            // Aqui usamos a checagem nativa, segura e síncrona do próprio axios
            if (error && typeof error === "object" && "isAxiosError" in error) {
                // Forçamos a tipagem segura para uma estrutura conhecida do AxiosError
                const axiosError = error as { response?: { status?: number; data?: { detail?: unknown } } };
                
                console.error("Status retornado:", axiosError.response?.status);
                console.error("Dados detalhados do erro do backend:", axiosError.response?.data);

                const backendData = axiosError.response?.data;
                if (backendData?.detail) {
                    if (Array.isArray(backendData.detail)) {
                        // Fazemos um mapeamento 100% tipado sem utilizar 'any' para satisfazer o ESLint
                        detalheServidor = backendData.detail
                            .map((errItem: unknown) => {
                                const e = errItem as { loc?: (string | number)[]; msg?: string };
                                const campoFailing = e.loc ? e.loc.join(".") : "campo";
                                const msgFailing = e.msg || "inválido";
                                return `${campoFailing} -> ${msgFailing}`;
                            })
                            .join(" | ");
                    } else {
                        detalheServidor = String(backendData.detail);
                    }
                }
            } else {
                console.error("Erro desconhecido capturado fora do ecossistema HTTP:", error);
            }

            const mensagemExibicao = detalheServidor 
                ? `Erro no Backend: ${detalheServidor}`
                : "O servidor rejeitou os dados (Erro 400). Verifique as propriedades enviadas e o console.";

            setFeedback({ 
                type: "warning", 
                message: mensagemExibicao
            });
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
            <AppSidebar activePath={pathname} />

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Sistema de Monitoramento de Pavimentação</h1>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Análise baseada em IA conforme normas DNIT</p>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <button
                            type="button"
                            onClick={() => setShowPopUp(!showPopUp)}
                            className="flex items-center gap-3 hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-gray-200 cursor-pointer"
                        >
                            <div className="text-right">
                                <p className="font-bold text-sm text-gray-900">{usuarioNome}</p>
                                <p className="text-xs text-gray-500 font-medium">{cargoUsuario}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                                <User size={20} />
                            </div>
                        </button>

                        {showPopUp && (
                            <div className="absolute top-16 right-28 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100">
                                    <p className="font-bold text-sm text-gray-900">{usuarioNome}</p>
                                    <p className="text-[11px] text-gray-500 italic font-medium">{cargoUsuario}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPopUp(false);
                                        router.push('/editar-perfil');
                                    }}
                                    className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 text-sm text-gray-700 transition-colors group cursor-pointer"
                                >
                                    <Settings size={16} className="text-gray-400 group-hover:text-blue-600" />
                                    <span className="group-hover:text-blue-600 font-bold">Editar Perfil</span>
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm hover:bg-red-100 font-bold transition-all cursor-pointer"
                        >
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </header>

                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Meus trabalhos</h2>
                        <p className="text-xs text-gray-500 font-medium italic mt-0.5">Acompanhe inspeções ou inicie uma nova</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowNovaInspecao(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0a5483] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083d61] cursor-pointer"
                    >
                        <Plus size={16} /> Nova inspeção
                    </button>
                </div>

                {feedback && (
                    <div className={`mb-6 rounded-3xl border px-5 py-4 shadow-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                            <p className="text-sm font-medium leading-6">{feedback.message}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                    {summaryCards.map((card) => (
                        <div key={card.label} className={`rounded-2xl border px-4 py-3 shadow-sm ${toneClasses(card.tone)}`}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a5483] text-white shadow-lg shadow-cyan-950/20">
                                <ClipboardList size={20} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Trabalhos</h2>
                                <p className="text-sm text-slate-500">Acompanhe o andamento das vistorias registradas</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0a5483] border-t-transparent" />
                                <p className="text-xs font-bold">Buscando trabalhos...</p>
                            </div>
                        ) : laudos.length === 0 ? (
                            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                Nenhum trabalho cadastrado no momento. Crie uma nova inspeção no botão acima para começar.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {laudos.map((laudo) => (
                                    <div
                                        key={laudo.id}
                                        className="group flex items-center justify-between rounded-2xl border border-gray-100 p-4 bg-white"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400 border border-gray-200 transition-colors shadow-xs">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 transition-colors">
                                                    Laudo Técnico #{laudo.id}
                                                </h4>
                                                <p className="text-xs text-gray-400 font-medium mt-0.5">Responsável: {laudo.responsavel}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                                <Calendar size={13} />
                                                {formatDateForDisplay(laudo.data)}
                                            </div>
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-2xs font-black text-blue-700 border border-blue-100 uppercase tracking-wider scale-90">
                                                Ativo
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-950">Equipe</h3>
                                    <p className="text-xs text-slate-500">Técnicos e colaboradores vinculados</p>
                                </div>
                            </div>

                            {colaboradores.length === 0 ? (
                                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 text-center">
                                    Sem colaboradores adicionados por enquanto.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {colaboradores.map((colab) => (
                                        <div key={colab.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs">
                                            <div>
                                                <p className="font-bold text-slate-900">{colab.nome}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">{colab.cargo || "Técnico"}</p>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>

                {showNovaInspecao && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.25)]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Preencha os dados da inspeção</h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowNovaInspecao(false)}
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
                                    aria-label="Fechar"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                                <div className="space-y-5">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Dados principais</p>
                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label htmlFor="inspection-date" className="mb-1 block text-sm font-bold text-slate-800">Data da inspeção</label>
                                                <input id="inspection-date" type="date" value={inspectionDate} onChange={(event) => { setInspectionDate(event.target.value); setMetadataDetected(false); }} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100" />
                                                <p className="mt-2 text-xs text-slate-500">{metadataDetected ? "Preenchido a partir dos metadados encontrados." : "Informe manualmente se não houver metadados."}</p>
                                            </div>

                                            <div>
                                                <label htmlFor="responsible-name" className="mb-1 block text-sm font-bold text-slate-800">Responsável técnico</label>
                                                <input id="responsible-name" type="text" value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nome do responsável técnico" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100" />
                                                <label htmlFor="responsible-identifier" className="mb-1 mt-3 block text-sm font-bold text-slate-800">Identificador</label>
                                                <input id="responsible-identifier" type="text" value={responsibleIdentifier} onChange={(event) => setResponsibleIdentifier(event.target.value)} placeholder="CREA / CFT / CPF" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100" />
                                            </div>
                                        </div>
                                    </div>

                                    {colaboradores.length > 0 && (
                                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 mb-3">Vincular Colaboradores</p>
                                            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                                                {colaboradores.map((colab) => {
                                                    const idStr = String(colab.id);
                                                    const isChecked = selectedCollaboratorIds.includes(idStr);
                                                    return (
                                                        <label key={colab.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-150 rounded-xl cursor-pointer text-xs font-bold text-slate-800 hover:bg-slate-50/50">
                                                            <span>{colab.nome} ({colab.cargo || "Técnico"})</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                className="w-4 h-4 rounded border-gray-300 text-[#0a5483] focus:ring-[#0a5483] accent-[#0a5483]"
                                                                onChange={() => {
                                                                    setSelectedCollaboratorIds(prev =>
                                                                        prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]
                                                                    );
                                                                }}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Resumo da inspeção</p>
                                    <div className="mt-4 space-y-3">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Data</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">{inspectionDate ? formatDateForDisplay(inspectionDate) : "Pendente"}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Responsável</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">{responsibleName || "Pendente"}</p>
                                            {responsibleIdentifier && <p className="mt-1 text-xs text-slate-500">{responsibleIdentifier}</p>}
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Colaboradores</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">{selectedCollaboratorIds.length} selecionado(s)</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                        <button type="button" disabled={salvando} onClick={() => setShowNovaInspecao(false)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
                                            Cancelar
                                        </button>
                                        <button type="button" disabled={salvando} onClick={handleCreateInspection} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a5483] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(10,84,131,0.22)] transition hover:bg-[#083d61] cursor-pointer disabled:opacity-75">
                                            {salvando ? "Salvando..." : "Criar inspeção"}
                                            {!salvando && <ChevronRight size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}