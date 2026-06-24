"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  Map,
  Download,
  LogOut,
  Search,
  SlidersHorizontal,
  User,
  Settings,
  Loader2,
  AlertCircle
} from "lucide-react";

import AppSidebar from "../../../components/AppSidebar";
import { authApi } from "../../lib/authApi";

interface TrechoInspecao {
  id: string;
  codigo_trecho: string;
  nome_trecho: string;
  data: string;
  pci: number;
  responsavel: string;
  tag_alerta?: string;
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
}

interface TrechoListResponseDTO {
  items: TrechoListItemDTO[];
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

export default function HistoricoInspecoesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const usuarioInicial = useMemo(() => obterUsuarioInicial(), []);
  const [isAutenticado, setIsAutenticado] = useState<boolean>(usuarioInicial.autenticado);
  const [usuarioNome, setUsuarioNome] = useState<string>(usuarioInicial.nome);
  const [cargoUsuario, setCargoUsuario] = useState<string>(usuarioInicial.cargo);
  const [carregandoSessao, setCarregandoSessao] = useState<boolean>(true); 
  const [showPopUp, setShowPopUp] = useState<boolean>(false);

  const [dadosAgrupados, setDadosAgrupados] = useState<LogradouroGrupo[]>([]);
  const [viasExpandidas, setViasExpandidas] = useState<string[]>([]);
  const [trechoFocado, setTrechoFocado] = useState<TrechoInspecao | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroPesquisa, setFiltroPesquisa] = useState<string>("");
  const [filtroCidade, setFiltroCidade] = useState<string>("");
  const [filtroUF, setFiltroUF] = useState<string>("");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("");
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>("");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [mostrarPainelFiltros, setMostrarPainelFiltros] = useState<boolean>(false);

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

  useEffect(() => {
    async function carregarTrechosDoBackend() {
      try {
        setLoading(true);
        setError(null);

        const response = await authApi.get<TrechoListResponseDTO>("/api/trechos/");
        const trechosLista = response.data?.items || [];

        const mapaGrupos: Record<string, LogradouroGrupo> = {};

        trechosLista.forEach((item: TrechoListItemDTO) => {
          const via = item.via || "Via Desconhecida";
          const municipio = item.municipio || "Município Não Informado";
          const uf = item.uf || "CE";
          const chaveLogradouro = `${via}-${municipio}-${uf}`;

          const novoTrecho: TrechoInspecao = {
            id: item.id_trecho,
            codigo_trecho: item.id_trecho,
            nome_trecho: item.nome_trecho || `Trecho ${item.id_trecho}`,
            data: item.criado_em ? item.criado_em.split("T")[0] : new Date().toISOString().split("T")[0],
            pci: item.pci !== undefined ? item.pci : 100,
            responsavel: item.responsavel_nome || "Não designado"
          };

          if (!mapaGrupos[chaveLogradouro]) {
            mapaGrupos[chaveLogradouro] = {
              id_logradouro: chaveLogradouro,
              via: via,
              municipio: municipio,
              uf: uf,
              pci_media: 0,
              trechos: []
            };
          }
          mapaGrupos[chaveLogradouro].trechos.push(novoTrecho);
        });

        const listaAgrupadaFinal = Object.values(mapaGrupos).map((grupo) => {
          const somaPci = grupo.trechos.reduce((acc, t) => acc + t.pci, 0);
          grupo.pci_media = Math.round(somaPci / grupo.trechos.length);
          return grupo;
        });

        setDadosAgrupados(listaAgrupadaFinal);
        
        if (listaAgrupadaFinal.length > 0) {
          setViasExpandidas([listaAgrupadaFinal[0].id_logradouro]);
          if (listaAgrupadaFinal[0].trechos.length > 0) {
            setTrechoFocado(listaAgrupadaFinal[0].trechos[0]);
          }
        }
      } catch (err) {
        console.error("Erro ao integrar com api de trechos:", err);
        setError("Não foi possível sincronizar o histórico com o servidor.");
      } finally {
        setLoading(false);
      }
    }

    if (isAutenticado !== undefined) {
      void carregarTrechosDoBackend();
    }
  }, [isAutenticado]);

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

  const getBadgeConfig = (pci: number) => {
    if (pci <= 40) return { bg: "bg-red-50 text-red-500 border-red-200", label: "Crítico" };
    if (pci <= 70) return { bg: "bg-amber-50 text-amber-500 border-amber-200", label: "Regular" };
    return { bg: "bg-emerald-50 text-emerald-500 border-emerald-200", label: "Excelente" };
  };

  const dadosFiltrados = useMemo(() => {
    return dadosAgrupados
      .map((grupo) => {
        const trechosFiltrados = groupTrechos(grupo);
        return { ...grupo, trechos: trechosFiltrados };
      })
      .filter((grupo) => grupo.trechos.length > 0);

    function groupTrechos(grupo: LogradouroGrupo) {
      return grupo.trechos.filter((trecho) => {
        if (filtroPesquisa && !grupo.via.toLowerCase().includes(filtroPesquisa.toLowerCase()) && !trecho.codigo_trecho.toLowerCase().includes(filtroPesquisa.toLowerCase())) {
          return false;
        }
        if (filtroCidade && !grupo.municipio.toLowerCase().includes(filtroCidade.toLowerCase())) return false;
        if (filtroUF && grupo.uf.toLowerCase() !== filtroUF.toLowerCase()) return false;
        if (filtroResponsavel && !trecho.responsavel.toLowerCase().includes(filtroResponsavel.toLowerCase())) return false;

        if (filtroCriticidade) {
          if (filtroCriticidade === "CRITICO" && trecho.pci > 40) return false;
          if (filtroCriticidade === "REGULAR" && (trecho.pci <= 40 || trecho.pci > 70)) return false;
          if (filtroCriticidade === "EXCELENTE" && trecho.pci <= 70) return false;
        }

        if (filtroDataInicio && new Date(trecho.data) < new Date(filtroDataInicio)) return false;
        if (filtroDataFim && new Date(trecho.data) > new Date(filtroDataFim)) return false;

        return true;
      });
    }
  }, [dadosAgrupados, filtroPesquisa, filtroCidade, filtroUF, filtroResponsavel, filtroCriticidade, filtroDataInicio, filtroDataFim]);

  const toggleVia = (idLogradouro: string) => {
    setViasExpandidas((prev) =>
      prev.includes(idLogradouro) ? prev.filter((id) => id !== idLogradouro) : [...prev, idLogradouro]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900 w-full">
      {isAutenticado && <AppSidebar activePath={pathname} />}

      <main className="flex-1 p-8 overflow-y-auto">
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

        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Histórico de Inspeções</h2>
            <p className="text-xs text-gray-500 font-medium italic mt-0.5">Dados agrupados por logradouro conforme normas DNIT</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a5483] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#083d61] transition-all cursor-pointer"
          >
            <Download size={16} /> EXPORTAR TUDO
          </button>
        </div>

        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por via ou código do trecho..."
                value={filtroPesquisa}
                onChange={(e) => setFiltroPesquisa(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarPainelFiltros(!mostrarPainelFiltros)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                mostrarPainelFiltros ? "bg-cyan-50 border-[#0a5483] text-[#0a5483]" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal size={16} /> Filtros Avançados
            </button>
          </div>

          {mostrarPainelFiltros && (
            <div className="pt-4 border-t border-gray-100 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cidade</label>
                <input
                  type="text"
                  value={filtroCidade}
                  onChange={(e) => setFiltroCidade(e.target.value)}
                  placeholder="Ex: Quixadá"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0a5483]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={filtroUF}
                  onChange={(e) => setFiltroUF(e.target.value)}
                  placeholder="Ex: CE"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none uppercase focus:border-[#0a5483]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Responsável Técnico</label>
                <input
                  type="text"
                  value={filtroResponsavel}
                  onChange={(e) => setFiltroResponsavel(e.target.value)}
                  placeholder="Nome do engenheiro"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0a5483]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Classificação</label>
                <select
                  value={filtroCriticidade}
                  onChange={(e) => setFiltroCriticidade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:border-[#0a5483]"
                >
                  <option value="">Todos</option>
                  <option value="CRITICO">Crítico (PCI ≤ 40)</option>
                  <option value="REGULAR">Regular (PCI 41-70)</option>
                  <option value="EXCELENTE">Excelente (PCI &gt; 70)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0a5483]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0a5483]"
                />
              </div>
            </div>
          )}
        </section>

        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 text-[#0a5483] animate-spin" />
            <p className="text-xs font-bold text-gray-500">Buscando histórico no servidor...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium mb-6">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && dadosFiltrados.length === 0 && (
          <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
            <p className="text-sm font-medium text-gray-400">Nenhum trecho ou inspeção encontrado para os filtros selecionados.</p>
          </div>
        )}

        {!loading && !error && dadosFiltrados.length > 0 && (
          <div className="space-y-6">
            {dadosFiltrados.map((grupo) => {
              const isExpandido = viasExpandidas.includes(grupo.id_logradouro);
              const configMedia = getBadgeConfig(grupo.pci_media);

              return (
                <div key={grupo.id_logradouro} className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                  <div 
                    onClick={() => toggleVia(grupo.id_logradouro)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-bold ${configMedia.bg}`}>
                        <span className="text-xl leading-none">{grupo.pci_media}</span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">Média</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{grupo.via}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-1 uppercase">
                          <span className="flex items-center gap-0.5"><MapPin size={12} /> {grupo.municipio}, {grupo.uf}</span>
                          <span>•</span>
                          <span>{grupo.trechos.length} subtrechos agrupados</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {isExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpandido && (
                    <div className="border-t border-gray-100 p-5 bg-slate-50/40 space-y-3">
                      {grupo.trechos.map((trecho) => {
                        const isFocado = trechoFocado?.id === trecho.id;
                        const configTrecho = getBadgeConfig(trecho.pci);

                        return (
                          <div 
                            key={trecho.id}
                            onClick={() => setTrechoFocado(trecho)}
                            className={`p-4 rounded-xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between transition-all cursor-pointer ${
                              isFocado ? "border-[#0a5483] shadow-md ring-2 ring-cyan-50/50" : "border-gray-100 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${configTrecho.bg}`}>
                                {trecho.pci}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-gray-800">{trecho.nome_trecho}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-0.5 font-mono">
                                  <span className="bg-gray-100 px-1 rounded text-gray-600">{trecho.codigo_trecho}</span>
                                  <span>•</span>
                                  <span>{trecho.data.split("-").reverse().join("/")}</span>
                                  <span>•</span>
                                  <span className="font-sans font-medium text-gray-500">Resp: {trecho.responsavel}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2 sm:mt-0 text-gray-400 self-end sm:self-auto">
                              <div 
                                title="Ver Detalhes do Trecho" 
                                className="cursor-pointer hover:text-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/laudos/${trecho.id}`);
                                }}
                              >
                                <FileText size={16} />
                              </div>
                              <div title="Focar Mapa" className={`cursor-pointer ${isFocado ? "text-[#0a5483]" : "hover:text-gray-700"}`}>
                                <Map size={16} />
                              </div>
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
    </div>
  );
}