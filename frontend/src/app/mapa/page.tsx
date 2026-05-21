"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Folder,
  History,
  ImageIcon,
  Loader2,
  LogOut,
  Map,
  Maximize,
  Settings,
  Upload,
  User,
} from "lucide-react";

import { SessionExpiredError, clearAuthSession } from "../../lib/authApi";
import {
  buildReviewPayloadFromUpload,
  confirmReviewOnServer,
  formatCoordinate,
  loadReviewItems,
  persistReviewItems,
  readConfirmationSummary,
  saveInspectionPosition,
  type MapReviewInspection,
} from "../../lib/map-review";

import MapContainerBase from "../../../components/MapContainerBase";

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

function buildUploadSnapshotFromReview(items: MapReviewInspection[]) {
  return items.map((item) => ({
    id: item.fotoId !== null ? String(item.fotoId) : item.id,
    fotoId: item.fotoId,
    fileName: item.fileName,
    imageUrl: item.imageUrl,
    latitude: item.latitude,
    longitude: item.longitude,
    locationSource: item.locationSource,
    manualLat: item.locationSource === "manual" && item.latitude !== null ? String(item.latitude) : "",
    manualLng: item.locationSource === "manual" && item.longitude !== null ? String(item.longitude) : "",
    locationException: item.locationException,
    status: item.status,
    message: item.note,
  }));
}

export default function MapaRevisaoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showPopUp, setShowPopUp] = useState(false);
  const [initialUserState] = useState<UserState>(() => getInitialUserState());
  const [usuarioNome] = useState(initialUserState.nome);
  const [cargoUsuario] = useState(initialUserState.cargo);
  const [items, setItems] = useState<MapReviewInspection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Carregando imagens processadas...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [persistedConfirmation, setPersistedConfirmation] = useState<{ confirmedAt?: string; total?: number } | null>(() => readConfirmationSummary());

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  useEffect(() => {
    let active = true;

    async function loadItems() {
      try {
        setLoading(true);
        setLoadingMessage("Buscando imagens processadas...");
        const loadedItems = await loadReviewItems();

        if (!active) {
          return;
        }

        setItems(loadedItems);
        setSelectedId((current) => current ?? loadedItems[0]?.id ?? null);
        setErrorMessage(null);

        if (!loadedItems.length) {
          setErrorMessage("Nenhuma imagem processada foi encontrada para revisão.");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof SessionExpiredError
          ? "Sua sessão expirou. Faça login novamente para revisar as inspeções."
          : error instanceof Error
            ? error.message
            : "Não foi possível carregar o mapa de revisão.";

        setErrorMessage(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      active = false;
    };
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const resolvedItems = useMemo(
    () => items.filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number"),
    [items]
  );

  const unresolvedItems = useMemo(
    () => items.filter((item) => item.latitude === null || item.longitude === null),
    [items]
  );

  const pendingChanges = useMemo(
    () => items.filter((item) => item.status !== "confirmed").length,
    [items]
  );

  const statusLabel = persistedConfirmation
    ? `Confirmado em ${new Date(persistedConfirmation.confirmedAt ?? "").toLocaleString("pt-BR")}`
    : `${resolvedItems.length} marcadores ativos`;

  async function updateItemPosition(itemId: string, latitude: number, longitude: number) {
    const itemAtual = items.find((item) => item.id === itemId);
    setSavingItemId(itemId);

    try {
      setItems((current) => {
        const next = current.map((item) => (
          item.id === itemId
            ? {
                ...item,
                latitude,
                longitude,
                locationSource: item.locationSource === "manual" ? item.locationSource : "manual",
                status: "ready" as const,
                updatedAt: new Date().toISOString(),
                note: "Posição ajustada manualmente no mapa.",
              }
            : item
        ));

        persistReviewItems(next);
        return next;
      });

      await saveInspectionPosition(itemId, latitude, longitude, itemAtual?.fotoId ?? null);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        setErrorMessage("Sua sessão expirou. Faça login novamente para continuar a revisão.");
      }
    } finally {
      setSavingItemId(null);
    }
  }

  async function saveAllChanges() {
    if (!items.length) {
      return;
    }

    setSavingAll(true);

    try {
      for (const item of items) {
        if (typeof item.latitude !== "number" || typeof item.longitude !== "number") {
          continue;
        }

        await saveInspectionPosition(item.id, item.latitude, item.longitude, item.fotoId);
      }

      persistReviewItems(items);
    } finally {
      setSavingAll(false);
    }
  }

  async function handleConfirmReview() {
    setConfirming(true);

    try {
      await saveAllChanges();
      await confirmReviewOnServer(items);
      setPersistedConfirmation({ confirmedAt: new Date().toISOString(), total: items.length });
      router.push("/enderecamento-trechos");
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        setErrorMessage("Sua sessão expirou. Faça login novamente para confirmar as inspeções.");
      }
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    if (!items.length || typeof window === "undefined") {
      return;
    }

    const snapshot = buildUploadSnapshotFromReview(items);
    const validSnapshot = snapshot.filter((item) => item.imageUrl);

    if (validSnapshot.length > 0) {
      window.sessionStorage.setItem("smp:map-review-batch", JSON.stringify(buildReviewPayloadFromUpload(validSnapshot)));
    }
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <aside className="w-20 bg-[#1e2235] flex flex-col items-center py-6 shrink-0 min-h-screen border-r border-gray-800">
        <div className="p-3 bg-[#0a5483] rounded-xl text-white mb-10">
          <Activity size={26} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-9 items-center w-full mb-auto">
          {[
            { Icon: Folder, label: "Arquivos", href: "/arquivos" },
            { Icon: Upload, label: "Enviar", href: "/upload-imagens" },
            { Icon: Maximize, label: "Expandir", href: "/expandir" },
            { Icon: FileText, label: "Documentos", href: "/documentos" },
            { Icon: Map, label: "Mapa", href: "/mapa" },
            { Icon: History, label: "Histórico", href: "/historico" },
          ].map(({ Icon, label, href }) => {
            const isActive = href === "/upload-imagens";

            return (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => router.push(href)}
                className={`transition-all duration-200 p-2 rounded-xl ${
                  isActive
                    ? "bg-[#0a5483] text-white shadow-[0_8px_24px_rgba(10,84,131,0.35)]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              </button>
            );
          })}
        </div>
        <div className="relative group cursor-pointer pb-4">
          <button type="button" title="Notificações" className="text-gray-400 group-hover:text-white transition-colors">
            <Bell size={26} strokeWidth={1.5} />
          </button>
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#1e2235] shadow-sm">
            3
          </span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 pb-28">
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
              <Map size={20} className="text-gray-600" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Visualização e Refinamento de Localização no Mapa</h2>
                <p className="text-xs text-gray-500 font-medium italic mt-0.5">Inspeção e georreferenciamento de vias</p>
              </div>
            </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-[#0c5a86] px-6 py-5 text-white shadow-[0_20px_60px_rgba(10,84,131,0.26)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Map size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Georreferenciamento</h3>
                <p className="text-sm text-white/80">Arraste os marcadores para ajustar a posição de cada inspeção.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/upload-imagens")}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/18"
            >
              <ChevronLeft size={16} />
              Voltar ao upload
            </button>
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,2.2fr)_360px]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-4xl border border-white/70 bg-white/90 p-2.5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                <MapContainerBase
                    items={items}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onMove={(itemId, latitude, longitude) => {
                      void updateItemPosition(itemId, latitude, longitude);
                    }}
                    loading={loading}
                    errorMessage={errorMessage}
                    loadingMessage={loadingMessage}
                  />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/70 bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Marcadores visíveis</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{resolvedItems.length}</p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Pendências</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{unresolvedItems.length}</p>
                </div>
                <div className="rounded-3xl border border-white/70 bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Estado</p>
                  <p className="mt-2 text-base font-black text-slate-900">{statusLabel}</p>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Inspeção selecionada</p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{selectedItem?.fileName ?? "Clique em um marcador"}</h3>
                  </div>
                  {savingItemId === selectedItem?.id ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                      <Loader2 size={14} className="animate-spin" />
                      Salvando
                    </span>
                  ) : selectedItem ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} />
                      Pronta
                    </span>
                  ) : null}
                </div>

                {selectedItem ? (
                  <div className="mt-5 space-y-4">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner">
                      <img
                        src={selectedItem.imageUrl}
                        alt={selectedItem.fileName}
                        className="h-60 w-full object-cover"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Latitude</p>
                        <p className="mt-1 text-lg font-black text-slate-900">{formatCoordinate(selectedItem.latitude)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Longitude</p>
                        <p className="mt-1 text-lg font-black text-slate-900">{formatCoordinate(selectedItem.longitude)}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white px-4 py-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Instruções</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Clique em um marcador para inspecionar a imagem. Depois, arraste o pin ou clique em outro ponto do mapa para reposicionar a inspeção selecionada.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void saveAllChanges()}
                        disabled={savingAll || confirming}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a5483] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(10,84,131,0.28)] transition hover:bg-[#083d61] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {savingAll ? <Loader2 size={16} className="animate-spin" /> : <Clock3 size={16} />}
                        Salvar revisão
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    Selecione um marcador para ver a imagem associada.
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Confirmação final</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">Fechar revisão e seguir para trechos</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Depois de validar os marcadores, confirme para consolidar o estado final das localizações.
                </p>

                <button
                  type="button"
                  onClick={() => void handleConfirmReview()}
                  disabled={confirming || loading || items.length === 0}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {confirming ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Confirmar registro das inspeções
                </button>

                {pendingChanges > 0 ? (
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {pendingChanges} imagem(ns) ainda estão em estado de revisão antes da confirmação.
                  </p>
                ) : null}
              </div>

              {unresolvedItems.length > 0 ? (
                <div className="rounded-[30px] border border-amber-200 bg-amber-50/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-700">Itens sem coordenada válida</p>
                  <div className="mt-4 space-y-3">
                    {unresolvedItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-white px-3 py-3 text-left transition hover:border-amber-300 hover:shadow-sm"
                      >
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                          <ImageIcon size={18} className="text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{item.fileName}</p>
                          <p className="text-xs text-slate-500">{item.note}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </section>
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-20 right-0 z-50 border-t border-slate-200 bg-white p-4 shadow-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Confirmação final</p>
            <p className="text-xs text-slate-500">
              {pendingChanges > 0
                ? `${pendingChanges} imagem(ns) aguardando validação antes do envio.`
                : "Todas as inspeções revisadas estão prontas para confirmação."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleConfirmReview()}
            disabled={confirming || loading || items.length === 0}
            className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {confirming ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Confirmar registro das inspeções
          </button>
        </div>
      </footer>
    </div>
  );
}
