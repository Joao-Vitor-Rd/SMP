"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  X, 
  Calendar, 
  User, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity, 
  Download,
  ArrowRight,
  History,
  FileText,
  ChevronRight,
  Settings,
  LogOut,
  SlidersHorizontal
} from "lucide-react";
import AppSidebar from "../../../components/AppSidebar";

// --- INTERFACES DE TIPOS ---
interface DefeitoItem {
  tipo: string;
  quantidade: number;
}

interface Inspecao {
  id: number;
  data: string;
  responsavelTecnico: string;
  pci: number;
  igg: number;
  classificacao: "Ótimo" | "Bom" | "Regular" | "Ruim" | "Péssimo";
  defeitos: DefeitoItem[];
}

interface TrechoLaudoDetalhado {
  id: string;
  via: string;
  kmInicio: number;
  kmFim: number;
  inspecoes: Inspecao[];
}

function obterUsuarioInicial() {
  if (typeof window === "undefined") return { autenticado: false, id: null, nome: "", cargo: "" };
  try {
    const usuarioSalvo = localStorage.getItem("usuario");
    if (!usuarioSalvo) return { autenticado: false, id: null, nome: "", cargo: "" };
    const user = JSON.parse(usuarioSalvo);
    return {
      autenticado: true,
      id: user.id || null,
      nome: user.nome?.trim() || user.username?.trim() || "Usuário Conectado",
      cargo: user.cargo === "supervisor" ? "Supervisor" : user.cargo === "tecnico" ? "Técnico" : "Colaborador"
    };
  } catch {
    return { autenticado: false, id: null, nome: "", cargo: "" };
  }
}

// --- DADOS MOCKADOS DE EXEMPLO ---
const MOCK_TRECHOS_LAUDOS: TrechoLaudoDetalhado[] = [
  {
    id: "TR-501",
    via: "BR-116",
    kmInicio: 210,
    kmFim: 215,
    inspecoes: [
      {
        id: 1001,
        data: "2026-06-15",
        responsavelTecnico: "Engª. Maria Barros",
        pci: 82,
        igg: 18,
        classificacao: "Bom",
        defeitos: [
          { tipo: "Trincas por Fadiga (Couro de Jacaré)", quantidade: 5 },
          { tipo: "Fendas e Trincas Isoladas Transversais", quantidade: 3 },
          { tipo: "Panelas / Buracos", quantidade: 1 },
          { tipo: "Exsudação", quantidade: 2 }
        ]
      }
    ]
  }
];

function getClassificacaoBadgeClass(classificacao: Inspecao["classificacao"]) {
  switch (classificacao) {
    case "Ótimo": return "bg-green-50 border-green-200 text-green-700";
    case "Bom": return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "Regular": return "bg-amber-50 border-amber-200 text-amber-700";
    case "Ruim": return "bg-orange-50 border-orange-200 text-orange-700";
    case "Péssimo": return "bg-red-50 border-red-200 text-red-700";
    default: return "bg-gray-50 border-gray-200 text-gray-700";
  }
}

export default function RelatorioPage() {
  const router = useRouter();
  const pathname = usePathname() || "/relatorio";

  // Estados de Sessão idênticos aos das demais telas normatizadas
  const usuarioInicial = useMemo(() => obterUsuarioInicial(), []);
  const [isAutenticado, setIsAutenticado] = useState<boolean>(usuarioInicial.autenticado);
  const [usuarioNome, setUsuarioNome] = useState<string>(usuarioInicial.nome);
  const [cargoUsuario, setCargoUsuario] = useState<string>(usuarioInicial.cargo);
  const [carregandoSessao, setCarregandoSessao] = useState<boolean>(true); 
  const [showPopUp, setShowPopUp] = useState<boolean>(false);

  // Controle do modal e dados
  const [modalOpen, setModalOpen] = useState(false);
  const [trechoAtivo, setTrechoAtivo] = useState<TrechoLaudoDetalhado | null>(null);
  const [inspecaoAtivaId, setInspecaoAtivaId] = useState<number | null>(null);
  const [compInspecaoAId, setCompInspecaoAId] = useState<string>("");
  const [compInspecaoBId, setCompInspecaoBId] = useState<string>("");
  const [exibirComparativo, setExibirComparativo] = useState(false);

  useEffect(() => {
    async function checarSessaoReal() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated || data.nome || data.id) {
            setIsAutenticado(true);
            const nomeExibicao = data.nome?.trim() || data.usuario?.nome?.trim() || "Usuário";
            setUsuarioNome(nomeExibicao);
            setCargoUsuario(data.cargo === "supervisor" ? "Supervisor" : data.is_tecnico || data.cargo === "tecnico" ? "Técnico" : "Colaborador");
            localStorage.setItem("usuario", JSON.stringify(data));
          } else {
            localStorage.removeItem("usuario");
            setIsAutenticado(false);
          }
        }
      } catch {
        if (!localStorage.getItem("usuario")) setIsAutenticado(false);
      } finally {
        setCarregandoSessao(false);
      }
    }
    checarSessaoReal();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Erro ao efetuar logout:", error);
    }
    localStorage.removeItem("usuario");
    setIsAutenticado(false);
    setUsuarioNome("");
    setCargoUsuario("");
    router.push("/login");
  };

  const handleAbrirLaudo = (trecho: TrechoLaudoDetalhado) => {
    setTrechoAtivo(trecho);
    setInspecaoAtivaId(null);
    setCompInspecaoAId("");
    setCompInspecaoBId("");
    setExibirComparativo(false);
    setModalOpen(true);
  };

  const inspecoesOrdenadas = useMemo(() => {
    if (!trechoAtivo?.inspecoes) return [];
    return [...trechoAtivo.inspecoes].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [trechoAtivo]);

  const inspecaoAtiva = useMemo(() => {
    if (!inspecoesOrdenadas.length) return null;
    if (inspecaoAtivaId === null) return inspecoesOrdenadas[0];
    return inspecoesOrdenadas.find(i => i.id === inspecaoAtivaId) || inspecoesOrdenadas[0];
  }, [inspecoesOrdenadas, inspecaoAtivaId]);

  const dadosComparativos = useMemo(() => {
    if (!exibirComparativo || !compInspecaoAId || !compInspecaoBId || !trechoAtivo) return null;
    const inspA = trechoAtivo.inspecoes.find(i => i.id === Number(compInspecaoAId));
    const inspB = trechoAtivo.inspecoes.find(i => i.id === Number(compInspecaoBId));
    
    if (!inspA || !inspB) return null;

    const [antiga, recente] = new Date(inspA.data).getTime() < new Date(inspB.data).getTime() 
      ? [inspA, inspB] 
      : [inspB, inspA];

    return {
      antiga,
      recente,
      difPCI: recente.pci - antiga.pci,
      difIGG: recente.igg - antiga.igg
    };
  }, [exibirComparativo, compInspecaoAId, compInspecaoBId, trechoAtivo]);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900 w-full">
      {isAutenticado && <AppSidebar activePath={pathname} />}

      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* HEADER PADRONIZADO E IDÊNTICO A O SEMAIS MÓDULOS */}
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sistema de Monitoramento de Pavimentação</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Análise baseada em IA conforme normas DNIT</p>
          </div>

          <div className="flex items-center gap-4 relative">
            {carregandoSessao && !isAutenticado ? (
              <div className="h-10 w-24 bg-transparent" />
            ) : isAutenticado ? (
              <>
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
              </>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 text-white bg-[#0a5483] border border-transparent px-5 py-2.5 rounded-xl text-sm hover:bg-[#083d61] font-bold transition-all shadow-sm cursor-pointer"
              >
                Login
              </button>
            )}
          </div>
        </header>

        {/* SUB-HEADER CONTEXTUAL DA TELA */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Relatório Técnico</h2>
            <p className="text-xs text-gray-500 font-medium italic mt-0.5">Quadro de defeitos estruturais e evolução temporal de trechos</p>
          </div>
        </div>

        {/* LISTAGEM DOS RELATÓRIOS SALVOS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-400 pb-2 border-b border-gray-200">
            <SlidersHorizontal size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Trechos com Diagnóstico Salvo</span>
          </div>

          <div className="space-y-3">
            {MOCK_TRECHOS_LAUDOS.map((trecho) => {
              const ultima = [...trecho.inspecoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
              return (
                <div 
                  key={trecho.id}
                  onClick={() => handleAbrirLaudo(trecho)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-200 bg-white p-5 rounded-2xl hover:border-gray-300 shadow-sm transition cursor-pointer gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 border border-gray-100">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Via {trecho.via} • KM {trecho.kmInicio} ao {trecho.kmFim}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400 font-bold font-mono">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{trecho.id}</span>
                        <span>•</span>
                        <span>{ultima.data.split("-").reverse().join("/")}</span>
                        <span>•</span>
                        <span className="font-sans font-medium text-gray-500">Resp: {ultima.responsavelTecnico}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto text-gray-400">
                    <span className="text-xs font-bold bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg text-blue-600">
                      {trecho.inspecoes.length} laudos
                    </span>
                    <ChevronRight size={18} strokeWidth={2.5} className="text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL DETALHADO DO LAUDO */}
      {modalOpen && trechoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
            
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Detalhes Técnicos do Segmento</span>
                <h2 className="text-base font-black text-[#0a5483] flex items-center gap-2 mt-0.5">
                  Via: {trechoAtivo.via} • KM {trechoAtivo.kmInicio} ao KM {trechoAtivo.kmFim}
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl border border-gray-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              
              <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <History size={13} /> Seleção de Histórico Cronológico
                </span>
                <div className="flex flex-wrap gap-2">
                  {inspecoesOrdenadas.map((insp, index) => (
                    <button
                      key={insp.id}
                      type="button"
                      onClick={() => {
                        setInspecaoAtivaId(insp.id);
                        setExibirComparativo(false);
                      }}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        inspecaoAtiva?.id === insp.id && !exibirComparativo
                          ? "bg-[#0a5483] border-[#0a5483] text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Calendar size={14} />
                      {insp.data.split("-").reverse().join("/")}
                      {index === 0 && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          inspecaoAtiva?.id === insp.id && !exibirComparativo ? "bg-white text-[#0a5483]" : "bg-blue-50 text-[#0a5483]"
                        }`}>
                          Atual
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {!exibirComparativo && inspecaoAtiva && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Responsável Técnico</p>
                      <p className="text-sm font-bold text-gray-800 mt-1 truncate">{inspecaoAtiva.responsavelTecnico}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Índice PCI</p>
                      <p className="text-lg font-black text-gray-900 font-mono mt-0.5">{inspecaoAtiva.pci}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Índice IGG</p>
                      <p className="text-lg font-black text-gray-900 font-mono mt-0.5">{inspecaoAtiva.igg}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Classificação DNIT</p>
                      <span className={`w-fit px-2.5 py-0.5 text-xs font-bold rounded-md border ${getClassificacaoBadgeClass(inspecaoAtiva.classificacao)}`}>
                        {inspecaoAtiva.classificacao}
                      </span>
                    </div>
                  </div>

                  <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                      <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-amber-500" />
                        Inconformidades do Pavimento
                      </h3>
                    </div>
                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase">
                            <th className="p-3">Defeito Identificado</th>
                            <th className="p-3 text-center w-36">Qtd / Extensão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                          {inspecaoAtiva.defeitos.map((def, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-medium text-gray-900">{def.tipo}</td>
                              <td className="p-3 text-center font-bold font-mono text-gray-600">{def.quantidade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-1.5">
                  <Activity size={15} className="text-blue-500" />
                  Análise Comparativa Inter-inspeções
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-gray-200/60 mb-3">
                  <select
                    value={compInspecaoAId}
                    onChange={(e) => setCompInspecaoAId(e.target.value)}
                    className="text-xs font-medium rounded-lg border border-gray-200 bg-white p-2.5 text-gray-700 focus:outline-none"
                  >
                    <option value="">Selecione a 1ª data...</option>
                    {trechoAtivo.inspecoes.map(i => (
                      <option key={i.id} value={i.id}>{i.data.split("-").reverse().join("/")}</option>
                    ))}
                  </select>

                  <select
                    value={compInspecaoBId}
                    onChange={(e) => setCompInspecaoBId(e.target.value)}
                    className="text-xs font-medium rounded-lg border border-gray-200 bg-white p-2.5 text-gray-700 focus:outline-none"
                  >
                    <option value="">Selecione a 2ª data...</option>
                    {trechoAtivo.inspecoes.map(i => (
                      <option key={i.id} value={i.id}>{i.data.split("-").reverse().join("/")}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!compInspecaoAId || !compInspecaoBId || compInspecaoAId === compInspecaoBId}
                    onClick={() => setExibirComparativo(true)}
                    className={`rounded-lg py-2 text-xs font-bold uppercase transition ${
                      compInspecaoAId && compInspecaoBId && compInspecaoAId !== compInspecaoBId
                        ? "bg-[#0a5483] text-white hover:bg-[#083d61] cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Comparar Períodos
                  </button>
                </div>

                {exibirComparativo && dadosComparativos && (
                  <div className="border border-blue-100 bg-blue-50/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                      <span>Evolução do Trecho:</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold">{dadosComparativos.antiga.data.split("-").reverse().join("/")}</span>
                      <ArrowRight size={12} className="text-gray-400" />
                      <span className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold text-gray-900">{dadosComparativos.recente.data.split("-").reverse().join("/")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase">Delta PCI</p>
                          <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{dadosComparativos.antiga.pci} → {dadosComparativos.recente.pci}</p>
                        </div>
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${dadosComparativos.difPCI >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {dadosComparativos.difPCI >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {dadosComparativos.difPCI >= 0 ? `+${dadosComparativos.difPCI}` : dadosComparativos.difPCI}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase">Delta IGG</p>
                          <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{dadosComparativos.antiga.igg} → {dadosComparativos.recente.igg}</p>
                        </div>
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${dadosComparativos.difIGG <= 0 ? "text-green-600" : "text-red-600"}`}>
                          {dadosComparativos.difIGG <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                          {dadosComparativos.difIGG > 0 ? `+${dadosComparativos.difIGG}` : `${dadosComparativos.difIGG}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}