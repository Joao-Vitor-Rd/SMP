"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Image as ImageIcon, Map, X } from "lucide-react";

// Estes tipos devem ser os mesmos usados pela equipe na US-10
type QueueStatus = "pending" | "uploading" | "completed" | "rejected";
type LocationException = "sem_gps" | "exif_corrompido";

export type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: QueueStatus;
  progress: number;
  message: string;
  hasLocation: boolean | null;
  manualLat: string;
  manualLng: string;
  locationException: LocationException | null;
};

interface ResolucaoPendentesProps {
  items: UploadItem[];
  updateQueueItem: (itemId: string, updater: (current: UploadItem) => UploadItem) => void;
  onProceedToMap: () => void;
}

function filterCoordInput(value: string) {
  let v = value.replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const firstMinus = v.indexOf("-");
  if (firstMinus > 0) {
    v = v.replace(/-/g, "");
  } else if (firstMinus === 0) {
    v = "-" + v.slice(1).replace(/-/g, "");
  }
  const dot = v.indexOf(".");
  if (dot !== -1) {
    v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
  }
  return v;
}

function parseLatitude(s: string): number | null {
  const t = s.trim();
  if (t === "" || t === "-" || t === "." || t === "-.") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < -90 || n > 90) return null;
  return n;
}

function parseLongitude(s: string): number | null {
  const t = s.trim();
  if (t === "" || t === "-" || t === "." || t === "-.") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < -180 || n > 180) return null;
  return n;
}

function isManualLocationResolved(item: UploadItem) {
  if (item.locationException) return true;
  return parseLatitude(item.manualLat) !== null && parseLongitude(item.manualLng) !== null;
}

function ToastSucesso({ mensagem, visivel, onClose }: { mensagem: string; visivel: boolean; onClose: () => void }) {
  useEffect(() => {
    if (visivel) {
      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    }
  }, [visivel, onClose]);

  if (!visivel) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative flex items-center gap-3 rounded-lg border border-green-200 bg-[#eefaf2] px-6 py-4 shadow-lg min-w-[320px]">
        <button
          onClick={onClose}
          className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-green-200 bg-white text-green-600 transition-colors hover:bg-green-50 shadow-sm"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
          <CheckCircle2 size={16} strokeWidth={3} />
        </div>
        <span className="text-sm font-medium text-green-800">{mensagem}</span>
      </div>
    </div>
  );
}

export default function ResolucaoPendentes({ items, updateQueueItem, onProceedToMap }: ResolucaoPendentesProps) {
  const [mostrarToast, setMostrarToast] = useState(false);
  const pendentes = useMemo(() => items.filter((item) => item.hasLocation === false), [items]);
  const todasResolvidas = useMemo(() => pendentes.every(isManualLocationResolved), [pendentes]);

  if (pendentes.length === 0) return null;

  const handleInputBlur = (item: UploadItem) => {
    const latValida = parseLatitude(item.manualLat) !== null;
    const lngValida = parseLongitude(item.manualLng) !== null;
    if (latValida && lngValida && !item.locationException) {
      setMostrarToast(true);
    }
  };

  return (
    <div className="space-y-6">
      <ToastSucesso 
        mensagem="Localização ajustada manualmente!" 
        visivel={mostrarToast} 
        onClose={() => setMostrarToast(false)} 
      />

      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={24} />
            Resolução de Coordenadas Pendentes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {pendentes.length} imagem(ns) não possuem metadados geográficos. Por favor, insira as coordenadas ou informe o status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pendentes.map((item) => {
          const latInvalid = !item.locationException && item.manualLat.trim() !== "" && parseLatitude(item.manualLat) === null;
          const lngInvalid = !item.locationException && item.manualLng.trim() !== "" && parseLongitude(item.manualLng) === null;
          const isResolved = isManualLocationResolved(item);

          return (
            <div
              key={item.id}
              className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all ${
                isResolved ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {item.previewUrl ? (
                    <Image src={item.previewUrl} alt={item.file.name} width={64} height={64} unoptimized className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{item.file.name}</p>
                    {isResolved && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Tamanho: {(item.file.size / 1024 / 1024).toFixed(2)} MB</p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`lat-${item.id}`} className="mb-1 block text-xs font-semibold text-gray-700">Latitude</label>
                      <input
                        id={`lat-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={!!item.locationException}
                        value={item.manualLat}
                        onChange={(e) => {
                          const v = filterCoordInput(e.target.value);
                          updateQueueItem(item.id, (c) => ({ ...c, manualLat: v, locationException: null }));
                        }}
                        onBlur={() => handleInputBlur(item)}
                        placeholder="-23.5505"
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
                          latInvalid ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`lng-${item.id}`} className="mb-1 block text-xs font-semibold text-gray-700">Longitude</label>
                      <input
                        id={`lng-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={!!item.locationException}
                        value={item.manualLng}
                        onChange={(e) => {
                          const v = filterCoordInput(e.target.value);
                          updateQueueItem(item.id, (c) => ({ ...c, manualLng: v, locationException: null }));
                        }}
                        onBlur={() => handleInputBlur(item)}
                        placeholder="-46.6333"
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
                          lngInvalid ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    </div>
                  </div>

                  {(latInvalid || lngInvalid) && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      Entrada inválida. Use decimais (Lat: -90 a 90, Lng: -180 a 180).
                    </p>
                  )}

                  <div className="mt-4 border-t border-amber-200/50 pt-3">
                    <p className="mb-2 text-xs font-semibold text-gray-600">Não possui as coordenadas?</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQueueItem(item.id, (c) => ({
                            ...c,
                            locationException: c.locationException === "sem_gps" ? null : "sem_gps",
                            manualLat: "",
                            manualLng: "",
                          }))
                        }
                        className={`rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                          item.locationException === "sem_gps"
                            ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                            : "border-gray-300 bg-white text-gray-700 hover:border-amber-400 hover:bg-amber-50"
                        }`}
                      >
                        Sem GPS
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateQueueItem(item.id, (c) => ({
                            ...c,
                            locationException: c.locationException === "exif_corrompido" ? null : "exif_corrompido",
                            manualLat: "",
                            manualLng: "",
                          }))
                        }
                        className={`rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                          item.locationException === "exif_corrompido"
                            ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                            : "border-gray-300 bg-white text-gray-700 hover:border-amber-400 hover:bg-amber-50"
                        }`}
                      >
                        EXIF Corrompido
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!todasResolvidas}
          onClick={onProceedToMap}
          className={`flex items-center gap-2 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${
            todasResolvidas
              ? "bg-[#0a5483] text-white shadow-lg hover:bg-[#083d61]"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          <Map size={18} strokeWidth={2.5} />
          {todasResolvidas ? "Revisão Geral no Mapa (US-12)" : "Resolva as pendências para prosseguir"}
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}