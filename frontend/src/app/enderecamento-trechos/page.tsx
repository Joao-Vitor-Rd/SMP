"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Activity, Bell, CheckCircle2, FileText, Folder, History, Loader2, LogOut, Map, Maximize, Route, Settings, Upload, User } from "lucide-react";

import { SessionExpiredError, clearAuthSession } from "../../lib/authApi";
import { readConfirmationSummary } from "../../lib/map-review";
import { loadTrechos, onTrechosBoundsUpdated, readPersistedTrechosBounds, type TrechoBoundingBox, type TrechoListItem } from "../../lib/trechosApi";
import AppSidebar from "../../../components/AppSidebar";

type UserState = {
  nome: string;
  cargo: string;
};

function getInitialUserState(): UserState {
  if (typeof window === "undefined") {
    return {
      nome: "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  }

  const usuarioJson = window.localStorage.getItem("usuario");

  if (!usuarioJson) {
    return {
      nome: "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  }

  try {
    const usuario = JSON.parse(usuarioJson) as { nome?: string };

    return {
      nome: usuario.nome?.trim() || "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  } catch {
    return {
      nome: "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  }
}

export default function EnderecamentoTrechosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showPopUp, setShowPopUp] = useState(false);
  const [initialUserState] = useState<UserState>(() => getInitialUserState());
  const [usuarioNome] = useState(initialUserState.nome);
  const [cargoUsuario] = useState(initialUserState.cargo);
  const [summary] = useState<{ confirmedAt?: string; total?: number } | null>(() => readConfirmationSummary());
  const [bounds, setBounds] = useState<TrechoBoundingBox | null>(() => readPersistedTrechosBounds());
  const [trechos, setTrechos] = useState<TrechoListItem[]>([]);
  const [loadingTrechos, setLoadingTrechos] = useState(true);
  const [trechosError, setTrechosError] = useState<string | null>(null);

  const boundsLabel = useMemo(() => {
    if (!bounds) {
      return "Nenhuma área visível foi salva; mostrando todos os trechos.";
    }

    return "Área visível do mapa salva; filtrando trechos por bounding box.";
  }, [bounds]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoadingTrechos(true);
        const items = await loadTrechos(bounds);

        if (!active) {
          return;
        }

        setTrechos(items);
        setTrechosError(items.length === 0 ? "Nenhum trecho encontrado para a área atual." : null);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof SessionExpiredError
          ? "Sua sessão expirou. Faça login novamente para ver os trechos."
          : error instanceof Error
            ? error.message
            : "Não foi possível carregar os trechos.";

        setTrechosError(message);
      } finally {
        if (active) {
          setLoadingTrechos(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [bounds]);

  useEffect(() => {
    return onTrechosBoundsUpdated(() => {
      setBounds(readPersistedTrechosBounds());
    });
  }, []);

  const totalFotos = trechos.reduce((accumulator, trecho) => accumulator + trecho.fotos.length, 0);

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
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
              className="flex items-center gap-3 hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-gray-200"
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
                    router.push("/editar-perfil");
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 text-sm text-gray-700 transition-colors group"
                >
                  <Settings size={16} className="text-gray-400 group-hover:text-blue-600" />
                  <span className="group-hover:text-blue-600 font-bold">Editar Perfil</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm hover:bg-red-100 font-bold transition-all"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto space-y-10">
          <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-10">
              <Route size={20} className="text-gray-600" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Endereçamento de Trechos</h2>
                <p className="text-xs text-gray-500 font-medium italic mt-0.5">Fluxo consolidado a partir da revisão do mapa</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-slate-700">
              <p className="text-sm font-bold text-slate-900">{boundsLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                O front reutiliza a última área visível do mapa para chamar GET /api/trechos com query params só quando a caixa estiver disponível.
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5" />
                <div>
                  <p className="font-black">Revisão confirmada</p>
                  <p className="mt-1 text-sm leading-6">
                    {summary?.total
                      ? `${summary.total} inspeção(ões) foram consolidadas para o próximo fluxo.`
                      : "As inspeções foram consolidadas e o fluxo está pronto para avançar."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Estado da revisão</p>
                <p className="mt-2 text-lg font-black text-slate-900">Concluída no mapa</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Confirmado em</p>
                <p className="mt-2 text-lg font-black text-slate-900">{summary?.confirmedAt ? new Date(summary.confirmedAt).toLocaleString("pt-BR") : "Agora"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={() => router.push("/meus-trabalhos")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Map size={16} />
                Voltar aos meus trabalhos
              </button>
              <button
                type="button"
                onClick={() => router.push("/upload-imagens")}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0a5483] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(10,84,131,0.22)] transition hover:bg-[#083d61]"
              >
                Seguir para novo lote
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Trechos carregados do backend</h3>
                <p className="text-sm text-gray-500 mt-1">{bounds ? "Filtrado pela área do mapa." : "Listagem completa, sem filtro espacial."}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Trechos</p>
                <p className="text-2xl font-black text-slate-900">{trechos.length}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Fotos vinculadas</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{totalFotos}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Modo de consulta</p>
                <p className="mt-2 text-lg font-black text-slate-900">{bounds ? "Bounding box" : "Listagem completa"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Status</p>
                <p className="mt-2 text-lg font-black text-slate-900">{loadingTrechos ? "Carregando..." : trechosError ? "Atenção" : "Sincronizado"}</p>
              </div>
            </div>

            {loadingTrechos ? (
              <div className="mt-6 flex items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#0a5483]" />
                Carregando trechos do backend...
              </div>
            ) : trechosError ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                {trechosError}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {trechos.map((trecho) => (
                  <article key={trecho.id_trecho} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Trecho</p>
                        <h4 className="mt-1 break-all text-lg font-black text-slate-900">{trecho.id_trecho}</h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                        {trecho.fotos.length} foto(s)
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {trecho.fotos.slice(0, 2).map((foto) => (
                        <div key={foto.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <p className="truncate text-sm font-bold text-slate-900">{foto.caminho_arquivo}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {foto.latitude !== null && foto.longitude !== null
                              ? `${foto.latitude.toFixed(6)} / ${foto.longitude.toFixed(6)}`
                              : "Sem coordenada"}
                          </p>
                        </div>
                      ))}
                      {trecho.fotos.length === 0 ? (
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm sm:col-span-2">
                          Nenhuma foto associada a este trecho.
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}