"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Calendar,
  AlertTriangle,
  History,
  FileText,
  Settings,
  LogOut,
  SlidersHorizontal,
  User,
  Loader2,
  AlertCircle,
  Download,
  MapPin,
  Activity,
} from "lucide-react";
import AppSidebar from "../../../components/AppSidebar";
import { authApi, clearAuthSession } from "../../lib/authApi";
import { type LaudoResponse, type ResumoPublicacao } from "../../lib/laudoApi";

// --- TIPOS ---

type GrupoRelatorio = {
  laudoId: number;
  data: string;
  responsavel: string;
  credencial: string;
  usuarios: Array<{ id?: number; nome: string; cargo: string }>;
  status?: string;
  resumo: Record<string, number>;
  publicado: boolean;
  publicadoEm?: string | null;
  via: string; // Garantido como string para a localização
  km?: string;
  pci?: number;
  igg?: number;
  observacoes?: string | null;
};

function formatarData(iso: string) {
  if (!iso) return "";
  const partes = iso.substring(0, 10).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return iso;
}

export default function RelatoriosPage() {
  const router = useRouter();
  const pathname = usePathname() || "/relatorio";

  // --- ESTADOS INICIAIS (Lazy Initialization) ---
  const [isAutenticado, setIsAutenticado] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("usuario");
    }
    return false;
  });

  const [usuarioNome, setUsuarioNome] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const usuarioSalvo = localStorage.getItem("usuario");
        if (usuarioSalvo) {
          const user = JSON.parse(usuarioSalvo);
          return user.nome?.trim() || user.username?.trim() || "Usuário Conectado";
        }
      } catch { /* ignora se corrompido */ }
    }
    return "";
  });

  const [cargoUsuario, setCargoUsuario] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const usuarioSalvo = localStorage.getItem("usuario");
        if (usuarioSalvo) {
          const user = JSON.parse(usuarioSalvo);
          return user.cargo === "supervisor" ? "Supervisor" : user.cargo === "tecnico" ? "Técnico" : "Colaborador";
        }
      } catch { /* ignora se corrompido */ }
    }
    return "";
  });

  const [showPopUp, setShowPopUp] = useState(false);
  const [grupos, setGrupos] = useState<GrupoRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoRelatorio | null>(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [filtroPesquisa, setFiltroPesquisa] = useState("");

  // --- REVALIDAÇÃO ASSÍNCRONA DA SESSÃO ---
  useEffect(() => {
    async function checarSessao() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated || data.nome || data.id) {
            setIsAutenticado(true);
            setUsuarioNome(data.nome?.trim() || "Usuário");
            setCargoUsuario(data.cargo === "supervisor" ? "Supervisor" : data.is_tecnico || data.cargo === "tecnico" ? "Técnico" : "Colaborador");
            localStorage.setItem("usuario", JSON.stringify(data));
          }
        }
      } catch { /* mantém os dados da inicialização */ }
    }
    void checarSessao();
  }, []);

  // --- CARGA DOS LAUDOS VIA API ---
  useEffect(() => {
    async function carregarLaudos() {
      try {
        setLoading(true);
        setError(null);

        const response = await authApi.get<LaudoResponse[]>("/api/laudos/");
        const laudosBrutos = response.data || [];

        const listaGrupos: GrupoRelatorio[] = laudosBrutos.map((l) => {
          const resumoDeteccoes: Record<string, number> = {};
          if (l.resumo) {
            Object.entries(l.resumo).forEach(([def, qtd]) => {
              resumoDeteccoes[def] = Number(qtd);
            });
          }

          const pub = !!l.publicacao_resumo;
          const pr = l.publicacao_resumo as ResumoPublicacao | undefined;

          // CORREÇÃO DA LOCALIZAÇÃO: Se não há via homologada, usa identificação padrão por ID
          const localizacaoReal = pr?.via || `Inspeção Técnica ID #${l.id}`;

          return {
            laudoId: l.id,
            data: l.data ? l.data.substring(0, 10) : new Date().toISOString().substring(0, 10),
            responsavel: l.responsavel || "Responsável Não Informado",
            credencial: l.credencial_responsavel || "CREA — Não Informado",
            usuarios: l.usuarios || [],
            status: l.status,
            resumo: resumoDeteccoes,
            publicado: pub,
            publicadoEm: l.publicado_em,
            via: localizacaoReal,
            km: pr?.km ?? undefined,
            pci: pr?.pci ?? undefined,
            igg: pr?.igg ?? undefined,
            observacoes: pr?.observacoes ?? undefined,
          };
        });

        const ordenados = listaGrupos
          .filter((g) => g.publicado)
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        setGrupos(ordenados);
      } catch (err) {
        console.error(err);
        setError("Não foi possível estabelecer ligação para obter os relatórios técnicos.");
      } finally {
        setLoading(false);
      }
    }

    void carregarLaudos();
  }, []);

  const abrirModal = useCallback((grupo: GrupoRelatorio) => {
    setGrupoAtivo(grupo);
    setModalAberto(true);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    localStorage.removeItem("usuario");
    router.push("/login");
  };

  const exportarRelatorioPDF = async () => {
    if (!grupoAtivo) return;
    try {
      setExportandoPdf(true);
      const res = await authApi.get(`/api/laudos/${grupoAtivo.laudoId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio-Tecnico-Laudo-${grupoAtivo.laudoId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar o arquivo PDF do relatório.");
    } finally {
      setExportandoPdf(false);
    }
  };

  const gruposFiltrados = useMemo(() => {
    if (!filtroPesquisa.trim()) return grupos;
    const termo = filtroPesquisa.toLowerCase();
    return grupos.filter(
      (g) =>
        String(g.laudoId).includes(termo) ||
        g.responsavel.toLowerCase().includes(termo) ||
        g.via.toLowerCase().includes(termo)
    );
  }, [grupos, filtroPesquisa]);

  // Função auxiliar para badge de classificação visual de qualidade (PCI)
  const obterBadgeQualidade = (pci?: number) => {
    if (pci === undefined) return { label: "Sem Índice", classe: "bg-gray-100 text-gray-600 border-gray-200" };
    if (pci >= 85) return { label: "Excelente", classe: "bg-green-50 text-green-700 border-green-200" };
    if (pci >= 70) return { label: "Bom", classe: "bg-blue-50 text-blue-700 border-blue-200" };
    if (pci >= 55) return { label: "Regular", classe: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Crítico", classe: "bg-red-50 text-red-700 border-red-200" };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900 w-full">
      {isAutenticado && <AppSidebar activePath={pathname} />}

      <main className="flex-1 p-8 overflow-y-auto">
        {/* --- CABEÇALHO --- */}
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sistema de Monitoramento de Pavimentação</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Análise baseada em IA conforme normas DNIT</p>
          </div>

          <div className="flex items-center gap-4 relative">
            {isAutenticado ? (
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
                      onClick={() => { setShowPopUp(false); router.push("/editar-perfil"); }}
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
                className="flex items-center gap-2 text-white bg-[#0a5483] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#083d61] transition-all"
              >
                Login
              </button>
            )}
          </div>
        </header>

        {/* --- TÍTULO DA PÁGINA --- */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900">Relatórios Técnicos Publicados</h2>
          <p className="text-xs text-gray-500 font-medium italic mt-0.5">Laudos estruturais compilados pós-inspeção visual e IA</p>
        </div>

        {/* Barra de Filtro */}
        <section className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm flex gap-3 mb-6">
          <div className="relative flex-1 w-full">
            <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Filtrar por ID do laudo, engenheiro responsável ou localização..."
              value={filtroPesquisa}
              onChange={(e) => setFiltroPesquisa(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:bg-white focus:border-gray-300 transition"
            />
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0a5483]" />
            <p className="text-xs font-bold text-gray-500">Buscando e compilando laudos...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
            <p className="text-sm font-medium text-gray-400">Nenhum relatório técnico localizado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gruposFiltrados.map((g) => {
              const totalDefeitos = Object.values(g.resumo).reduce((a, b) => a + b, 0);
              const badgeQualidade = obterBadgeQualidade(g.pci);

              return (
                <div
                  key={g.laudoId}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        LAUDO #{g.laudoId}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeQualidade.classe}`}>
                          PCI: {badgeQualidade.label}
                        </span>
                      </div>
                    </div>

                    {/* LOCALIZAÇÃO ATUALIZADA: Ícone de mapa + Local real dinâmico */}
                    <div className="flex items-start gap-1.5 text-gray-800 my-2">
                      <MapPin size={15} className="text-[#0a5483] mt-0.5 shrink-0" />
                      <h3 className="font-extrabold text-sm line-clamp-2">
                        {g.via}
                      </h3>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                      Responsável: <span className="text-gray-600 font-bold">{g.responsavel}</span>
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-gray-400 font-medium">Data da Vistoria</p>
                        <p className="font-bold text-gray-700 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} className="text-gray-400" /> {formatarData(g.data)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Anomalias por IA</p>
                        <p className="font-bold text-gray-700 flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={12} className="text-amber-500" /> {totalDefeitos} detecção(ões)
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirModal(g)}
                    className="w-full mt-5 bg-slate-50 border border-gray-200 text-[#0a5483] text-xs font-bold py-2 rounded-xl hover:bg-[#0a5483] hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} /> Abrir Relatório Técnico
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- MODAL DETALHADO --- */}
      {modalAberto && grupoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
            
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Visualizador de Relatório Estrutural</span>
                <h2 className="text-base font-black text-[#0a5483] mt-0.5">
                  Laudo Técnico #{grupoAtivo.laudoId} — {formatarData(grupoAtivo.data)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-xl border border-gray-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Engenheiro de Registro</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{grupoAtivo.responsavel}</p>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{grupoAtivo.credencial}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Equipe de Campo / Colaboradores</p>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {grupoAtivo.usuarios.length > 0 
                        ? grupoAtivo.usuarios.map(u => u.nome).join(", ") 
                        : "Nenhum colaborador adicional registrado."}
                    </p>
                  </div>
                  {grupoAtivo.publicado && (
                    <button
                      type="button"
                      disabled={exportandoPdf}
                      onClick={exportarRelatorioPDF}
                      className="mt-2 text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {exportandoPdf ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Gerando PDF...
                        </>
                      ) : (
                        <>
                          <Download size={13} /> Exportar Laudo Oficial (.PDF)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* CLASSIFICAÇÃO ADAPTADA */}
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-3 border-b border-gray-100 pb-3 flex items-center gap-1.5">
                  <Activity size={14} className="text-slate-400" /> Parâmetros de Linha e Índices DNIT
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Localização Coletada</p>
                    <p className="text-xs font-bold text-gray-800 mt-1 line-clamp-1">{grupoAtivo.via}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Segmento Extensão</p>
                    <p className="text-xs font-bold text-gray-800 mt-1 font-mono">
                      {grupoAtivo.km ? `KM ${grupoAtivo.km}` : "Não Parametrizado"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Índice PCI</p>
                    <p className={`text-xs font-black mt-1 font-mono ${grupoAtivo.pci && grupoAtivo.pci >= 70 ? "text-green-600" : "text-amber-600"}`}>
                      {grupoAtivo.pci !== undefined ? `${grupoAtivo.pci} / 100` : "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Índice IGG (DNIT)</p>
                    <p className="text-xs font-black text-gray-800 mt-1 font-mono">
                      {grupoAtivo.igg !== undefined ? grupoAtivo.igg : "N/A"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Quantificação de Danos */}
              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-4 border-b border-gray-100 pb-3">
                  Quadro Geral de Patologias Encontradas
                </h3>

                {Object.keys(grupoAtivo.resumo).length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">Nenhuma patologia identificada pela inteligência artificial.</p>
                ) : (
                  <div className="overflow-hidden border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                          <th className="p-3">Defeito Identificado</th>
                          <th className="p-3 w-32">Ocorrências</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                        {Object.entries(grupoAtivo.resumo).map(([def, qtd]) => (
                          <tr key={def} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-gray-900 capitalize">{def}</td>
                            <td className="p-3 font-bold font-mono text-gray-600">{qtd}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Observações */}
              <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-2">Considerações Finais do Engenheiro</h3>
                <p className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-gray-100 italic">
                  {grupoAtivo.observacoes || "Nenhuma consideração adicional anotada para este documento."}
                </p>
              </section>

              {/* Histórico */}
              <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <History size={13} /> Mudar para Outro Documento Coletado
                </span>
                <div className="flex flex-wrap gap-2">
                  {grupos.map((g) => (
                    <button
                      key={g.laudoId}
                      type="button"
                      onClick={() => void abrirModal(g)}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        grupoAtivo.laudoId === g.laudoId
                          ? "bg-[#0a5483] border-[#0a5483] text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Calendar size={14} />
                      #{g.laudoId} — {formatarData(g.data)}
                    </button>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}