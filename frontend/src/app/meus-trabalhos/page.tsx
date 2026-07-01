"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    LogOut,
    Plus,
    Settings,
    User,
    FileText,
    AlertTriangle,
    XCircle,
    Clock,
    Eye
} from "lucide-react";

import { authApi, clearAuthSession } from "../../lib/authApi";
import { createLaudo, INSPECTION_ID_KEY, listLaudos, type LaudoResponse } from "../../lib/laudoApi";
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
    status?: "em_andamento" | "concluido"; 
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

    const cargo = usuario?.cargo;

    return {
        id: usuario?.id,
        nome: nomeExibicao,
        cargo: cargo === "supervisor" ? "Supervisor" : cargo === "tecnico" ? "Técnico" : "Colaborador",
        isTecnico: cargo === "tecnico" || cargo === "colaborador",
    };
}

function getHojeString() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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

    return {
        inspectionDate: metadataDate || draft?.inspectionDate || "",
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

function validarCPF(cpf: string): boolean {
    const numeros = cpf.replace(/\D/g, "");
    if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(numeros.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    const digitoVerificador1 = resto === 10 || resto === 11 ? 0 : resto;
    if (digitoVerificador1 !== parseInt(numeros.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(numeros.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    const digitoVerificador2 = resto === 10 || resto === 11 ? 0 : resto;
    return digitoVerificador2 === parseInt(numeros.charAt(10));
}

function detectarTipoIdentificador(valor: string): "CPF/CFT" | "CREA" | "DESCONHECIDO" {
    const limpo = valor.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!limpo) return "DESCONHECIDO";
    
    if (/^\d+$/.test(limpo) && limpo.length <= 11) {
        return "CPF/CFT";
    }
    if (/[A-Z]/.test(valor.toUpperCase()) || valor.includes("/") || (limpo.length > 11 && limpo.length <= 20)) {
        return "CREA";
    }
    return "CPF/CFT";
}

export default function MeusTrabalhosPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [showPopUp, setShowPopUp] = useState(false);
    const [showNovaInspecao, setShowNovaInspecao] = useState(false);
    
    const [inspecaoSelecionada, setInspecaoSelecionada] = useState<LaudoResponse | null>(null);
    
    const [laudos, setLaudos] = useState<LaudoResponse[]>([]);
    const [colaboradores, setColaboradores] = useState<ColaboradorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const [initialUserState] = useState(() => getInitialUserState());
    const [initialInspectionState] = useState(() => getInitialInspectionState(initialUserState.nome));
    const [usuarioNome] = useState(initialUserState.nome);
    const [cargoUsuario] = useState(initialUserState.cargo);
    
    const [usuarioId] = useState(initialUserState.id);
    const [isTecnico] = useState(initialUserState.isTecnico ?? false);
    const [inspectionDate, setInspectionDate] = useState(initialInspectionState.inspectionDate);
    const [responsibleName, setResponsibleName] = useState(initialInspectionState.responsibleName);
    const [responsibleIdentifier, setResponsibleIdentifier] = useState(initialInspectionState.responsibleIdentifier);
    const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>(initialInspectionState.selectedCollaboratorIds);
    
    const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
    const [camposInvalidos, setCamposInvalidos] = useState<Record<string, boolean>>({});
    
    const [feedback, setFeedback] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);
    const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);
    const [metadataDetected, setMetadataDetected] = useState(initialInspectionState.metadataDetected);

    // CORREÇÃO DO LINT: Transferido toda a lógica de reinicialização de estados reativos que estava no useEffect para este Event Handler
    const handleAbrirNovaInspecao = () => {
        if (canUseStorage()) {
            const freshState = getInitialInspectionState(initialUserState.nome);
            
            const sessionMetadata = parseJson<{ inspectionDate?: string; dataInspecao?: string; date?: string }>(
                window.sessionStorage.getItem(INSPECTION_METADATA_KEY)
            );
            
            if (sessionMetadata) {
                const parsedSessionDate = formatDateForInput(sessionMetadata.inspectionDate ?? sessionMetadata.dataInspecao ?? sessionMetadata.date ?? null);
                setInspectionDate(parsedSessionDate);
                setMetadataDetected(true);
            } else {
                setInspectionDate("");
                setMetadataDetected(false);
            }

            setResponsibleName(freshState.responsibleName);
            setResponsibleIdentifier(freshState.responsibleIdentifier);
            setSelectedCollaboratorIds(freshState.selectedCollaboratorIds);
            setErrosValidacao([]);
            setCamposInvalidos({});
            setModalFeedback(null);
        }
        setShowNovaInspecao(true);
    };
        async function carregarDadosDoServidor() {
            try {
                const [laudosData, resColabs] = await Promise.all([
                    listLaudos(),
                    authApi.get<ColaboradorResponse[]>("/api/supervisores/me/colaboradores").catch(() => ({ data: [] }))
                ]);

useEffect(() => {
    let isMounted = true;

                if (Array.isArray(laudosData)) {
                    // Filtro defensivo no cliente: técnicos/colaboradores só visualizam
                    // laudos onde são o responsável ou foram adicionados como colaboradores.
                    // O filtro primário deve existir no backend; este é uma segunda camada.
                    const laudosFiltrados = isTecnico && usuarioId
                        ? laudosData.filter((laudo) => {
                            const eResponsavel = laudo.responsavel_id === usuarioId;
                            const eColaborador = Array.isArray(laudo.usuarios)
                                && laudo.usuarios.some((u) => u.id === usuarioId);
                            return eResponsavel || eColaborador;
                        })
                        : laudosData;

                    const ordenados = laudosFiltrados.sort((a, b) => b.id - a.id);
                    setLaudos(ordenados);
                }

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
            setFeedback({ type: "error", message: "Não foi possível conectar ao servidor para carregar suas inspeções." });
        } finally {
            if (isMounted) setLoading(false);
        }
    }

    carregarDadosDoServidor();

    const handleFocus = () => { void carregarDadosDoServidor(); };
    window.addEventListener("focus", handleFocus);

    return () => {
        isMounted = false;
        window.removeEventListener("focus", handleFocus);
    };
}, []);

    const inspecoesEmAndamento = laudos.filter(l => l.status === "em_andamento" || !l.resumo || Object.keys(l.resumo).length === 0);
    const inspecoesConcluidas = laudos.filter(l => l.status === "concluido" || (l.resumo && Object.keys(l.resumo).length > 0));

    const proximoIdEstimado = laudos.length > 0 ? Math.max(...laudos.map(l => l.id)) + 1 : 1;

    function handleLogout() {
        clearAuthSession();
        router.push("/login");
    }

    async function handleCreateInspection() {
        const listaErros: string[] = [];
        const mapaCampos: Record<string, boolean> = {};

        if (!inspectionDate) {
            listaErros.push("Selecione uma data válida no calendário para prosseguir com a inspeção.");
            mapaCampos["inspectionDate"] = true;
        } else if (new Date(inspectionDate) > new Date(getHojeString())) {
            listaErros.push("Não é permitido abrir inspeções com datas futuras.");
            mapaCampos["inspectionDate"] = true;
        }

        const nomeLimpo = responsibleName.trim();
        const regexNomeValido = /^[A-Za-zÀ-ÿ\s]{3,80}$/;
        if (!nomeLimpo) {
            listaErros.push("O campo de responsável técnico é obrigatório e não pode ficar em branco.");
            mapaCampos["responsibleName"] = true;
        } else if (!regexNomeValido.test(nomeLimpo)) {
            listaErros.push("O nome do responsável deve ter entre 3 e 80 caracteres (apenas letras e espaços são permitidos).");
            mapaCampos["responsibleName"] = true;
        }

        const identificadorLimpo = responsibleIdentifier.trim().toUpperCase();
        if (!identificadorLimpo) {
            listaErros.push("O Identificador Profissional (CREA, CFT ou CPF) é obrigatório.");
            mapaCampos["responsibleIdentifier"] = true;
        } else {
            const tipoDetectado = detectarTipoIdentificador(responsibleIdentifier);
            
            if (tipoDetectado === "CPF/CFT") {
                const apenasNumeros = identificadorLimpo.replace(/\D/g, "");
                if (apenasNumeros.length !== 11) {
                    listaErros.push("Identificador inválido: Para registros do tipo CPF ou CFT, insira exatamente 11 dígitos numéricos.");
                    mapaCampos["responsibleIdentifier"] = true;
                } else if (!validarCPF(apenasNumeros)) {
                    listaErros.push("Identificador inválido: O número de CPF/CFT informado não é matemático ou possui dígitos verificadores incorretos.");
                    mapaCampos["responsibleIdentifier"] = true;
                }
            } else if (tipoDetectado === "CREA") {
                const regexCreaValido = /^[A-Z0-9.\-/]{5,20}$/;
                if (!regexCreaValido.test(identificadorLimpo)) {
                    listaErros.push("Identificador inválido: O número de registro CREA deve possuir entre 5 e 20 caracteres válidos (ex: 506248963-1 ou 123456/SP).");
                    mapaCampos["responsibleIdentifier"] = true;
                }
            }
        }

        setErrosValidacao(listaErros);
        setCamposInvalidos(mapaCampos);

        if (listaErros.length > 0) {
            setModalFeedback({
                type: "error",
                message: "Revise os campos do formulário para corrigir as pendências apontadas."
            });
            return;
        }

        setSalvando(true);
        setModalFeedback(null);

        try {
            const colabsIdsNumericos = selectedCollaboratorIds.map(Number);

            const payloadBackend = {
                data: inspectionDate, 
                responsavel: nomeLimpo,
                credencial_responsavel: identificadorLimpo,
                colaboradores_ids: colabsIdsNumericos, 
                resumo: {} 
            };

            const response = await authApi.post<LaudoResponse>("/api/laudos/", payloadBackend);
            const novoLaudoId = response.data.id;

            if (canUseStorage()) {
                window.sessionStorage.removeItem(INSPECTION_DRAFT_KEY);
                window.sessionStorage.removeItem(INSPECTION_METADATA_KEY);
            const response = await createLaudo(payloadBackend);
            const novoLaudoId = response.id;

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
                window.sessionStorage.setItem(INSPECTION_ID_KEY, String(novoLaudoId));
            }

            setShowNovaInspecao(false);
            setFeedback({ type: "success", message: "Inspeção iniciada com sucesso! Redirecionando para a captação de imagens..." });
            
            router.push(`/upload-imagens?laudoId=${novoLaudoId}`);
        } catch (error: unknown) {
            console.error("Erro ao submeter laudo:", error);
            let detalheServidor = "";

            if (error && typeof error === "object" && "isAxiosError" in error) {
                const axiosError = error as { response?: { status?: number; data?: { detail?: unknown } } };
                const backendData = axiosError.response?.data;
                
                if (backendData?.detail) {
                    if (Array.isArray(backendData.detail)) {
                        detalheServidor = backendData.detail
                            .map((errItem: unknown) => {
                                const e = errItem as { loc?: (string | number)[]; msg?: string };
                                const campoFailing = e.loc ? e.loc.join(".") : "propriedade";
                                const msgFailing = e.msg || "está incorreta";
                                return `${campoFailing}: ${msgFailing}`;
                            })
                            .join(" | ");
                    } else {
                        detalheServidor = String(backendData.detail);
                    }
                }
            }

            setModalFeedback({ 
                type: "error", 
                message: detalheServidor 
                    ? `Erro de validação do servidor: ${detalheServidor}` 
                    : "Falha na requisição: O servidor recusou os dados enviados. Revise os campos e tente novamente."
            });
        } finally {
            setSalvando(false);
        }
    }

    const tipoAtualDetectado = detectarTipoIdentificador(responsibleIdentifier);

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
                        <h2 className="text-2xl font-extrabold text-gray-900">Minhas Inspeções</h2>
                        <p className="text-xs text-gray-500 font-medium italic mt-0.5">Gerencie vistorias ativas ou revise relatórios concluídos</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAbrirNovaInspecao}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0a5483] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083d61] cursor-pointer"
                    >
                        <Plus size={16} /> Nova inspeção
                    </button>
                </div>

                {feedback && (
                    <div className={`mb-6 rounded-2xl border px-5 py-4 shadow-sm transition-all animate-fadeIn ${
                        feedback.type === "success" 
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900" 
                            : feedback.type === "warning"
                            ? "border-amber-200 bg-amber-50 text-amber-950"
                            : "border-rose-200 bg-rose-50 text-rose-950"
                    }`}>
                        <div className="flex items-start gap-3">
                            {feedback.type === "success" && <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />}
                            {feedback.type === "warning" && <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-600" />}
                            {feedback.type === "error" && <XCircle size={19} className="mt-0.5 shrink-0 text-rose-600" />}
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider mb-0.5">
                                    {feedback.type === "success" && "Operação Concluída"}
                                    {feedback.type === "warning" && "Aviso de Validação"}
                                    {feedback.type === "error" && "Erro de Processamento"}
                                </p>
                                <p className="text-sm font-medium leading-relaxed">{feedback.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0a5483] border-t-transparent" />
                        <p className="text-xs font-bold">Carregando painel de vistorias...</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 mt-4">
                        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-950">Inspeções em Andamento</h3>
                                        <p className="text-xs text-slate-500">Aguardando captação de mídias ou fechamento</p>
                                    </div>
                                </div>
                                <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full border border-amber-200">
                                    {inspecoesEmAndamento.length}
                                </span>
                            </div>

                            {inspecoesEmAndamento.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 font-medium">
                                    Nenhuma inspeção activa no momento.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-125 overflow-y-auto pr-1">
                                    {inspecoesEmAndamento.map((item) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setInspecaoSelecionada(item)}
                                            className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-gray-400 group-hover:text-[#0a5483] transition-colors" />
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#0a5483] transition-colors">Inspeção #{item.id}</h4>
                                                    <p className="text-2xs text-gray-400 font-medium">Responsável: {item.responsavel}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right text-2xs text-gray-400 font-semibold">
                                                    {formatDateForDisplay(item.data)}
                                                </div>
                                                <Eye size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all ml-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <ClipboardList size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-950">Inspeções Concluídas</h3>
                                        <p className="text-xs text-slate-500">Relatórios homologados e finalizados</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-200">
                                    {inspecoesConcluidas.length}
                                </span>
                            </div>

                            {inspecoesConcluidas.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 font-medium">
                                    Nenhuma inspeção concluída encontrada.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-125 overflow-y-auto pr-1">
                                    {inspecoesConcluidas.map((item) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setInspecaoSelecionada(item)}
                                            className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 size={18} className="text-emerald-500" />
                                                <div>
                                                    <h4 className="font-black text-sm text-gray-900 group-hover:text-[#0a5483] transition-colors">Inspeção #{item.id}</h4>
                                                    <p className="text-2xs text-gray-400 font-medium">Responsável: {item.responsavel}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right text-2xs text-gray-400 font-semibold">
                                                    {formatDateForDisplay(item.data)}
                                                </div>
                                                <Eye size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-all ml-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {inspecaoSelecionada && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
                        <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-fadeIn">
                            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                                <div>
                                    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${
                                        inspecaoSelecionada.status === "concluido" || (inspecaoSelecionada.resumo && Object.keys(inspecaoSelecionada.resumo).length > 0)
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                            : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}>
                                        {inspecaoSelecionada.status === "concluido" || (inspecaoSelecionada.resumo && Object.keys(inspecaoSelecionada.resumo).length > 0) ? "Concluída" : "Em Andamento"}
                                    </span>
                                    <h3 className="text-xl font-black text-slate-950">Dados da Inspeção #{inspecaoSelecionada.id}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setInspecaoSelecionada(null)}
                                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 text-lg font-bold cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data da Vistoria</p>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{formatDateForDisplay(inspecaoSelecionada.data)}</p>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Responsável Técnico</p>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{inspecaoSelecionada.responsavel}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-0.5">ID Profissional: {inspecaoSelecionada.credencial_responsavel}</p>
                                </div>

                                {inspecaoSelecionada.usuarios && inspecaoSelecionada.usuarios.length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Equipe Vinculada</p>
                                        <div className="space-y-1 max-h-24 overflow-y-auto">
                                            {inspecaoSelecionada.usuarios.map((u, index) => (
                                                <div key={index} className="text-xs text-gray-700 font-medium bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                                                    {u.nome} <span className="text-2xs text-gray-400 font-bold uppercase ml-1">({u.cargo})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {inspecaoSelecionada.resumo && Object.keys(inspecaoSelecionada.resumo).length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Métricas/Ocorrências Identificadas</p>
                                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                                            {Object.entries(inspecaoSelecionada.resumo).map(([key, val]) => (
                                                <div key={key} className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                                    <p className="text-2xs text-gray-400 font-bold capitalize">{key.replace(/_/g, ' ')}</p>
                                                    <p className="text-sm font-black text-slate-800">{String(val)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                {inspecoesEmAndamento.some(l => l.id === inspecaoSelecionada.id) && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setInspecaoSelecionada(null);
                                            router.push(`/upload-imagens?laudoId=${inspecaoSelecionada.id}`);
                                        }} 
                                        className="rounded-xl bg-[#0a5483] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#083d61] cursor-pointer"
                                    >
                                        Continuar Coleta
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    onClick={() => setInspecaoSelecionada(null)} 
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showNovaInspecao && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.25)]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                                        Abrir Inspeção #{proximoIdEstimado}
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Preencha os dados obrigatórios para iniciar a vistoria do pavimento</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowNovaInspecao(false)}
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 cursor-pointer text-xl font-bold"
                                    aria-label="Fechar"
                                >
                                    ×
                                </button>
                            </div>

                            {modalFeedback && (
                                <div className={`mt-4 rounded-2xl border px-5 py-4 shadow-sm transition-all animate-fadeIn ${
                                    modalFeedback.type === "success" 
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900" 
                                        : modalFeedback.type === "warning"
                                        ? "border-amber-200 bg-amber-50 text-amber-950"
                                        : "border-rose-200 bg-rose-50 text-rose-950"
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {modalFeedback.type === "success" && <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />}
                                        {modalFeedback.type === "warning" && <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-600" />}
                                        {modalFeedback.type === "error" && <XCircle size={19} className="mt-0.5 shrink-0 text-rose-600" />}
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider mb-0.5">
                                                {modalFeedback.type === "success" && "Operação Concluída"}
                                                {modalFeedback.type === "warning" && "Aviso de Validação"}
                                                {modalFeedback.type === "error" && "Erro de Processamento"}
                                            </p>
                                            <p className="text-sm font-medium leading-relaxed">{modalFeedback.message}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {errosValidacao.length > 0 && (
                                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-950 transition-all animate-fadeIn">
                                    <div className="flex items-start gap-3">
                                        <XCircle size={19} className="mt-0.5 shrink-0 text-rose-600" />
                                        <div className="w-full">
                                            <p className="text-xs font-black uppercase tracking-wider mb-1.5">
                                                Existem campos pendentes de correção ({errosValidacao.length})
                                            </p>
                                            <ul className="list-disc list-inside space-y-1 text-sm font-medium leading-relaxed">
                                                {errosValidacao.map((erro, index) => (
                                                    <li key={index}>{erro}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                                <div className="space-y-5">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Dados principais</p>
                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label htmlFor="inspection-date" className="mb-1 block text-sm font-bold text-slate-800">Data da inspeção</label>
                                                <input 
                                                    id="inspection-date" 
                                                    type="date" 
                                                    max={getHojeString()} 
                                                    value={inspectionDate} 
                                                    onChange={(event) => { 
                                                        setInspectionDate(event.target.value); 
                                                        setMetadataDetected(false); 
                                                        setCamposInvalidos(p => ({ ...p, inspectionDate: false }));
                                                    }} 
                                                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:ring-4 focus:ring-cyan-100 ${
                                                        camposInvalidos["inspectionDate"] ? "border-rose-500 focus:border-rose-500 ring-rose-100" : "border-slate-200 focus:border-[#0a5483]"
                                                    }`} 
                                                />
                                                <p className="mt-2 text-xs text-slate-500">{metadataDetected ? "Preenchido a partir dos metadados encontrados." : "Informe manualmente se não houver metadados."}</p>
                                            </div>

                                            <div>
                                                <label htmlFor="responsible-name" className="mb-1 block text-sm font-bold text-slate-800">Responsável técnico</label>
                                                <input 
                                                    id="responsible-name" 
                                                    type="text" 
                                                    maxLength={80} 
                                                    value={responsibleName} 
                                                    onChange={(event) => {
                                                        const apenasLetras = event.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
                                                        setResponsibleName(apenasLetras);
                                                        setCamposInvalidos(p => ({ ...p, responsibleName: false }));
                                                    }}
                                                    placeholder="Nome do responsável técnico" 
                                                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:ring-4 focus:ring-cyan-100 ${
                                                        camposInvalidos["responsibleName"] ? "border-rose-500 focus:border-rose-500 ring-rose-100" : "border-slate-200 focus:border-[#0a5483]"
                                                    }`} 
                                                />
                                                <div className="flex justify-end mt-1">
                                                    <span className="text-[10px] text-gray-400 font-medium">{responsibleName.length}/80 caracteres</span>
                                                </div>

                                                <label htmlFor="responsible-identifier" className="mb-1 mt-3 block text-sm font-bold text-slate-800">Identificador</label>
                                                <input 
                                                    id="responsible-identifier" 
                                                    type="text" 
                                                    maxLength={20} 
                                                    value={responsibleIdentifier} 
                                                    onChange={(event) => {
                                                        const idTratado = event.target.value.replace(/[^A-Za-z0-9.\-/]/g, "");
                                                        setResponsibleIdentifier(idTratado);
                                                        setCamposInvalidos(p => ({ ...p, responsibleIdentifier: false }));
                                                    }}
                                                    placeholder="CREA / CFT / CPF" 
                                                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:ring-4 focus:ring-cyan-100 ${
                                                        camposInvalidos["responsibleIdentifier"] ? "border-rose-500 focus:border-rose-500 ring-rose-100" : "border-slate-200 focus:border-[#0a5483]"
                                                    }`} 
                                                />
                                                <div className="flex justify-between items-center mt-1.5 px-0.5">
                                                    {responsibleIdentifier.trim().length > 0 ? (
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                            tipoAtualDetectado === "CPF/CFT" 
                                                                ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                                                : "bg-purple-50 text-purple-700 border border-purple-100"
                                                        }`}>
                                                            Tipo: {tipoAtualDetectado}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 font-medium italic">Digite para o system detectar o padrão</span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 font-medium">{responsibleIdentifier.length}/20 caracteres</span>
                                                </div>
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
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Resumo temporário</p>
                                    <div className="mt-4 space-y-3">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Data Pretendida</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">{inspectionDate ? formatDateForDisplay(inspectionDate) : "Pendente"}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Responsável</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">
                                                {responsibleName.trim().length >= 3 ? responsibleName : "Pendente"}
                                            </p>
                                            {responsibleIdentifier && responsibleIdentifier.trim().length >= 4 && (
                                                <p className="mt-1 text-xs text-slate-500 uppercase font-semibold">
                                                    {responsibleIdentifier} ({tipoAtualDetectado})
                                                </p>
                                            )}
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