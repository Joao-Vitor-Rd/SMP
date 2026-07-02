"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  Map,
  Search,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  XCircle,
  X,
  AlertTriangle,
  History,
  CheckCircle2,
  User,
  Settings,
  LogOut
} from "lucide-react";

import AppSidebar from "../../../components/AppSidebar";
import { authApi, clearAuthSession } from "../../lib/authApi";

// --- INTERFACES ALINHADAS COM O BACKEND ---
interface TrechoInspecao {
  id: string;
  codigo_trecho: string;
  nome_trecho: string;
  data: string;
  pci: number;
  responsavel: string;
  tag_alerta?: string;
  municipio: string;
  uf: string;
  via: string;
  defeitos: Record<string, number>;
  classificacao: string;
}

interface LogradouroGrupo {
  id_logradouro: string;
  via: string;
  municipio: string;
  uf: string;
  pci_media: number;
  trechos: TrechoInspecao[];
}

interface TrechoListItemDTO {
  id_trecho: string;
  criado_em: string | null;
  foto_ids: number[];
  fotos: Array<{ id: number; caminho_arquivo: string; latitude: number | null; longitude: number | null }>;
  via?: string;
  municipio?: string;
  uf?: string;
  nome_trecho?: string;
  pci?: number;
  responsavel_nome?: string;
  cidade?: string;             
  responsavel_tecnico?: string; 
  classificacao_qualidade?: string; 
  defeitos?: Record<string, number> | string[]; 
}

interface TrechoListResponseDTO {
  items: TrechoListItemDTO[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function formatarData(iso: string) {
  const partes = iso.substring(0, 10).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return iso;
}

function totalDefeitos(resumo: Record<string, number>): number {
  return Object.values(resumo).reduce((soma, qtd) => soma + qtd, 0);
}

export default function HistoricoPage() {
  const router = useRouter();
  const pathname = usePathname() || "/historico";

  // --- Inicialização segura a partir do localStorage para evitar re-renders em cascata no useEffect ---
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

  // --- Estados de Dados ---
  const [logradouros, setLogradouros] = useState<LogradouroGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({});
  const [filtroPesquisa, setFiltroPesquisa] = useState("");
  
  // Estados para o Modal de Detalhes
  const [modalAberto, setModalAberto] = useState(false);
  const [trechoAtivo, setTrechoAtivo] = useState<TrechoInspecao | null>(null);

  // 1) Revalidação assíncrona da sessão em Background
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
      } catch { /* mantém dados iniciais do localStorage */ }
    }
    void checarSessao();
  }, []);

  // 2) Carrega trechos do backend
  useEffect(() => {
    async function carregarTrechos() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await authApi.get<TrechoListResponseDTO>("/api/trechos/?limit=100");
        const itensBrutos = response.data?.items || [];

        const dicionarioGrupos: Record<string, LogradouroGrupo> = {};

        itensBrutos.forEach((item, index) => {
          const via = item.via?.trim() || "Via Principal";
          const municipio = item.municipio || item.cidade || "Município Não Informado";
          const uf = item.uf || "UF";
          const responsavel = item.responsavel_nome || item.responsavel_tecnico || "Responsável Técnico";
          const classificacao = item.classificacao_qualidade || "Regular";
          
          let defeitosMapeados: Record<string, number> = {};
          if (item.defeitos && !Array.isArray(item.defeitos)) {
            defeitosMapeados = item.defeitos as Record<string, number>;
          }

          const nomeAmigavel = (item.nome_trecho && item.nome_trecho !== item.id_trecho)
            ? item.nome_trecho 
            : `${via} - Segmento A${index + 1}`;

          let pciCalculado = 100;
          if (typeof item.pci === "number") {
            pciCalculado = item.pci;
          } else if (item.classificacao_qualidade) {
            const q = item.classificacao_qualidade.toLowerCase();
            if (q === "excelente") pciCalculado = 95;
            else if (q === "bom") pciCalculado = 80;
            else if (q === "regular") pciCalculado = 60;
            else pciCalculado = 40;
          }

          const chaveGrupo = `${via}-${municipio}-${uf}`.toLowerCase().replace(/\s+/g, "");

          const trechoInspecao: TrechoInspecao = {
            id: String(item.id_trecho),
            codigo_trecho: `TR-${String(item.id_trecho).substring(0, 6).toUpperCase()}`,
            nome_trecho: nomeAmigavel,
            data: item.criado_em ? item.criado_em.substring(0, 10) : new Date().toISOString().substring(0, 10),
            pci: pciCalculado,
            responsavel: responsavel,
            tag_alerta: pciCalculado < 60 ? "Crítico" : pciCalculado < 85 ? "Atenção" : "Estável",
            municipio,
            uf,
            via,
            defeitos: defeitosMapeados,
            classificacao
          };

          if (!dicionarioGrupos[chaveGrupo]) {
            dicionarioGrupos[chaveGrupo] = {
              id_logradouro: chaveGrupo,
              via,
              municipio,
              uf,
              pci_media: 0,
              trechos: [],
            };
          }

          dicionarioGrupos[chaveGrupo].trechos.push(trechoInspecao);
        });

        // Correção das funções internas que causavam erros do TS
        const gruposFormatados = Object.values(dicionarioGrupos).map((grupo) => {
          const somaPci = grupo.trechos.reduce((acc, t) => acc + t.pci, 0);
          return {
            ...grupo,
            pci_media: grupo.trechos.length > 0 ? Math.round(somaPci / grupo.trechos.length) : 100,
          };
        });

        setLogradouros(gruposFormatados);

        if (gruposFormatados.length > 0) {
          setSecaoAberta({ [gruposFormatados[0].id_logradouro]: true });
        }

      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar o histórico de trechos.");
      } finally {
        setLoading(false);
      }
    }

    void carregarTrechos();
  }, []);

  const alternarSecao = (id: string) => {
    setSecaoAberta((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirModalDetalhes = (trecho: TrechoInspecao) => {
    setTrechoAtivo(trecho);
    setModalAberto(true);
  };

  const handleLogout = () => {
    clearAuthSession();
    localStorage.removeItem("usuario");
    router.push("/login");
  };

  const gruposFiltrados = useMemo(() => {
    if (!filtroPesquisa.trim()) return logradouros;
    const termo = filtroPesquisa.toLowerCase();
    return logradouros.filter(
      (g) =>
        g.via.toLowerCase().includes(termo) ||
        g.municipio.toLowerCase().includes(termo) ||
        g.trechos.some((t) => t.responsavel.toLowerCase().includes(termo) || t.nome_trecho.toLowerCase().includes(termo))
    );
  }, [logradouros, filtroPesquisa]);

  const historicoAnterior = useMemo(() => {
    if (!trechoAtivo) return [];
    return logradouros
      .flatMap(g => g.trechos)
      .filter(t => t.id !== trechoAtivo.id && t.via === trechoAtivo.via && new Date(t.data) < new Date(trechoAtivo.data))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [logradouros, trechoAtivo]);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900 w-full">
      {isAutenticado && <AppSidebar activePath={pathname} />}

      <main className="flex-1 p-8 overflow-y-auto">
        {/* --- CABEÇALHO PADRONIZADO E IDÊNTICO AO RELATÓRIO --- */}
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

        {/* --- TÍTULO DA PÁGINA PADRONIZADO --- */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Histórico de Vias & Logradouros</h2>
            <p className="text-xs text-gray-500 font-medium italic mt-0.5">Seções catalogadas e evolução do Índice PCI por IA</p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <section className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm flex gap-3 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome de via, município ou engenheiro..."
              value={filtroPesquisa}
              onChange={(e) => setFiltroPesquisa(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:bg-white focus:border-gray-300 transition"
            />
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0a5483]" />
            <p className="text-xs font-bold text-gray-500">Carregando histórico de vias...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
            <XCircle className="mx-auto text-gray-300 mb-3" size={32} />
            <p className="text-sm font-medium text-gray-400">Nenhum registro localizado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400 pb-2 border-b border-gray-200">
              <SlidersHorizontal size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Trechos Catalogados</span>
            </div>

            {gruposFiltrados.map((grupo) => {
              const estaAberto = !!secaoAberta[grupo.id_logradouro];
              const pciMedia = grupo.pci_media;
              const badgeColor = pciMedia >= 85 ? "bg-green-50 text-green-700 border-green-200" : pciMedia >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200";

              return (
                <div key={grupo.id_logradouro} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition hover:border-gray-300">
                  <div
                    onClick={() => alternarSecao(grupo.id_logradouro)}
                    className="p-5 flex justify-between items-center cursor-pointer select-none bg-white hover:bg-gray-50/40 transition"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm truncate">{grupo.via}</h3>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                          {grupo.municipio} — {grupo.uf}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`px-2.5 py-1 border text-xs font-mono font-black rounded-lg ${badgeColor}`}>
                        PCI Médio: {pciMedia}
                      </div>
                      <div className="text-gray-400">
                        {estaAberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {estaAberto && (
                    <div className="border-t border-gray-100 bg-gray-50/30 p-4 space-y-2.5">
                      {grupo.trechos.map((trecho) => {
                        const subBadge = trecho.pci >= 85 ? "bg-green-50 text-green-700 border-green-200" : trecho.pci >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200";

                        return (
                          <div
                            key={trecho.id}
                            onClick={() => abrirModalDetalhes(trecho)}
                            className="p-4 bg-white border border-gray-200 hover:border-[#0a5483] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center transition duration-150 cursor-pointer shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${subBadge}`}>
                                {trecho.pci}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-gray-800">{trecho.nome_trecho}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-0.5 font-mono">
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{trecho.codigo_trecho}</span>
                                  <span>•</span>
                                  <span>{formatarData(trecho.data)}</span>
                                  <span>•</span>
                                  <span className="font-sans font-medium text-gray-500">Resp: {trecho.responsavel}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs font-bold text-[#0a5483] hover:underline mt-2 sm:mt-0">
                              <span>Análise Completa</span>
                              <FileText size={15} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- MODAL DETALHADO COMPATÍVEL --- */}
      {modalAberto && trechoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Detalhes da Inspeção (Histórico)</span>
                <h2 className="text-base font-black text-[#0a5483] mt-0.5">
                  Segmento: {trechoAtivo.nome_trecho} — {formatarData(trechoAtivo.data)}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Responsável Técnico</p>
                  <p className="text-sm font-bold text-gray-800 mt-1 truncate">{trechoAtivo.responsavel}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Data da Inspeção</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{formatarData(trechoAtivo.data)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Localidade</p>
                  <p className="text-sm font-bold text-gray-800 mt-1 truncate">{trechoAtivo.municipio} ({trechoAtivo.uf})</p>
                </div>
              </div>

              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-3">
                  <Map size={15} className="text-[#0a5483]" /> Dados de Qualidade da Seção
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Via Catalogada</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{trechoAtivo.via}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Código</p>
                    <p className="text-sm font-bold text-gray-800 mt-1 font-mono">{trechoAtivo.codigo_trecho}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Condição</p>
                    <p className="text-sm font-bold text-gray-800 mt-1 capitalize">{trechoAtivo.classificacao}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">PCI</p>
                    <p className={`text-sm font-black mt-1 font-mono ${trechoAtivo.pci >= 85 ? "text-green-600" : trechoAtivo.pci >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      {trechoAtivo.pci} / 100
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-1.5 border-b border-gray-100 pb-3 mb-4">
                  <AlertTriangle size={15} className="text-amber-500" /> Defeitos Identificados
                </h3>

                {Object.keys(trechoAtivo.defeitos).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Nenhum defeito registrado.</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg w-fit">
                      <CheckCircle2 size={14} />
                      {totalDefeitos(trechoAtivo.defeitos)} defeito(s) no total
                    </div>

                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase">
                            <th className="p-3">Tipo de Defeito</th>
                            <th className="p-3 w-32">Quantidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                          {Object.entries(trechoAtivo.defeitos)
                            .sort((a, b) => b[1] - a[1])
                            .map(([defeito, qtd]) => (
                              <tr key={defeito} className="hover:bg-slate-50/50">
                                <td className="p-3 font-medium text-gray-900 capitalize">{defeito}</td>
                                <td className="p-3 font-bold font-mono text-gray-700">{qtd}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>

              <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-3 flex items-center gap-1.5">
                  <History size={15} className="text-gray-400" /> Histórico Cronológico da Via
                </h3>
                {historicoAnterior.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Inspeção cronológica inicial para esta via.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {historicoAnterior.map((h) => {
                      const totalD = totalDefeitos(h.defeitos);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => abrirModalDetalhes(h)}
                          className="w-full flex items-center justify-between py-2.5 text-left hover:bg-slate-50 rounded-lg px-2 -mx-2 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-gray-800">{h.nome_trecho}</span>
                            <span className="text-xs text-gray-500">({formatarData(h.data)})</span>
                          </div>
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${h.pci >= 85 ? "bg-green-50 text-green-700" : h.pci >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                            PCI: {h.pci} ({totalD} defeitos)
                          </span>
                        </button>
                      );
                    })}
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