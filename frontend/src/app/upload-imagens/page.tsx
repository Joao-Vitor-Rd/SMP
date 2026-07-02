"use client";

import axios from "axios";
import exifr from "exifr";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type MutableRefObject } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Folder,
  History,
  Info,
  Loader2,
  LogOut,
  Map as MapIcon,
  MapPin,
  Maximize,
  Settings,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { authApi, clearAuthSession } from "../../lib/authApi";
import { INSPECTION_ID_KEY } from "../../lib/laudoApi";
import { type MapReviewLocationSource } from "../../lib/map-review";
import { buildReviewPayloadFromUpload, clearConfirmationSummary, persistReviewItems, readPersistedReviewItems } from "../../lib/map-review";

type QueueStatus = "pending" | "uploading" | "completed" | "rejected";

type LocationException = "sem_gps" | "exif_corrompido";

type UploadFileLike = Pick<File, "name" | "size" | "type" | "lastModified">;

type UploadItem = {
  id: string;
  serverFotoId: number | null;
  file: UploadFileLike;
  originalFile?: File;
  previewUrl: string;
  serverImageUrl: string | null;
  serverLatitude: number | null;
  serverLongitude: number | null;
  status: QueueStatus;
  progress: number;
  message: string;
  hasLocation: boolean | null;
  locationSource: MapReviewLocationSource | null;
  manualLat: string;
  manualLng: string;
  locationException: LocationException | null;
};

type UploadItemSnapshot = Omit<UploadItem, "file" | "originalFile"> & {
  file: UploadFileLike;
};

type UserState = {
  nome: string;
  cargo: string;
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/tiff", "image/x-tiff", "image/webp"];
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "tif", "tiff"];
const UPLOAD_QUEUE_STORAGE_KEY = "smp:upload-queue";
const originalFileCache = new globalThis.Map<string, File>();

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

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const size = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** size).toFixed(size === 0 ? 0 : 1)} ${units[size]}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Falha ao preparar a imagem para o mapa."));
    };

    reader.readAsDataURL(file);
  });
}

function toUploadFileLike(file: File): UploadFileLike {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

function createId(file: UploadFileLike) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFileExtension(file: UploadFileLike) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function getFileKindLabel(file: UploadFileLike) {
  const extension = getFileExtension(file);
  if (extension === "jpg" || extension === "jpeg") return "JPG";
  if (extension === "png") return "PNG";
  if (extension === "tif" || extension === "tiff") return "TIFF";
  if (extension === "webp") return "WebP";
  return extension.toUpperCase() || "ARQUIVO";
}

function isBlobUrl(url: string) {
  return url.startsWith("blob:");
}

function isUploadFileLike(value: unknown): value is UploadFileLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<UploadFileLike>;

  return (
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.size === "number" &&
    Number.isFinite(candidate.size) &&
    typeof candidate.type === "string" &&
    typeof candidate.lastModified === "number" &&
    Number.isFinite(candidate.lastModified)
  );
}

function isUploadItemSnapshot(value: unknown): value is UploadItemSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<UploadItemSnapshot> & { file?: unknown };

  return (
    typeof candidate.id === "string" &&
    (candidate.serverFotoId === undefined || candidate.serverFotoId === null || typeof candidate.serverFotoId === "number") &&
    isUploadFileLike(candidate.file) &&
    typeof candidate.previewUrl === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.progress === "number" &&
    typeof candidate.message === "string" &&
    (candidate.locationSource === undefined || candidate.locationSource === null || typeof candidate.locationSource === "string")
  );
}

function createPreviewForRestoredItem(item: UploadItemSnapshot) {
  return item.serverImageUrl ?? item.previewUrl ?? "";
}

function serializeUploadItem(item: UploadItem): UploadItemSnapshot {
  return {
    id: item.id,
    serverFotoId: item.serverFotoId,
    file: item.file,
    previewUrl: item.previewUrl,
    serverImageUrl: item.serverImageUrl,
    serverLatitude: item.serverLatitude,
    serverLongitude: item.serverLongitude,
    status: item.status,
    progress: item.progress,
    message: item.message,
    hasLocation: item.hasLocation,
    locationSource: item.locationSource,
    manualLat: item.manualLat,
    manualLng: item.manualLng,
    locationException: item.locationException,
  };
}

function restoreUploadItem(snapshot: UploadItemSnapshot): UploadItem {
  const manualReady = isCompleteManualCoordinatePair(snapshot.manualLat, snapshot.manualLng);

  return {
    ...snapshot,
    serverFotoId: typeof snapshot.serverFotoId === "number" ? snapshot.serverFotoId : null,
    file: snapshot.file,
    originalFile: originalFileCache.get(snapshot.id),
    hasLocation: manualReady ? true : snapshot.hasLocation,
    locationSource: snapshot.locationSource ?? (manualReady ? "manual" : snapshot.hasLocation ? "gps" : null),
    status: manualReady ? "completed" : snapshot.status,
    progress: manualReady ? 100 : snapshot.progress,
    message:
      manualReady
        ? "Localização informada e pronta para revisão."
        : snapshot.message,
    previewUrl: createPreviewForRestoredItem(snapshot),
  };
}

function hydrateUploadItemFromReview(item: UploadItem, review: ReturnType<typeof readPersistedReviewItems>[number] | undefined): UploadItem {
  if (!review) {
    return item;
  }

  const reviewHasLocation = typeof review.latitude === "number" && typeof review.longitude === "number";

  if (!reviewHasLocation) {
    return item;
  }

  return {
    ...item,
    serverFotoId: review.fotoId ?? item.serverFotoId,
    hasLocation: true,
    locationSource: review.locationSource === "manual" ? "manual" : "gps",
    status: review.status === "confirmed" || review.status === "ready" ? "completed" : item.status,
    progress: 100,
    message: review.locationSource === "manual"
      ? "Localização informada e pronta para revisão."
      : "Localização identificada via GPS.",
  };
}

function readStoredUploadQueue(): UploadItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.sessionStorage.getItem(UPLOAD_QUEUE_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const storedItems = parsed.filter(isUploadItemSnapshot).map(restoreUploadItem);
    const reviewById = new globalThis.Map(readPersistedReviewItems().map((item) => [item.id, item]));

    return storedItems.map((item) => hydrateUploadItemFromReview(item, reviewById.get(item.id)));
  } catch {
    return [];
  }
}

function persistUploadQueue(items: UploadItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serializableItems = items.map(serializeUploadItem);
  window.sessionStorage.setItem(UPLOAD_QUEUE_STORAGE_KEY, JSON.stringify(serializableItems));
}

function resolveOriginalFile(item: UploadItem) {
  return item.originalFile ?? originalFileCache.get(item.id) ?? null;
}

function isCompleteManualCoordinatePair(latitudeText: string, longitudeText: string) {
  const latitude = Number(latitudeText.trim());
  const longitude = Number(longitudeText.trim());

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function validateFile(file: UploadFileLike) {
  if (!isUploadFileLike(file)) {
    return "Arquivo inválido. Selecione a imagem novamente.";
  }

  console.log("Validando arquivo:", file.name, file.type);
  const extension = getFileExtension(file);
  const mime = file.type.toLowerCase();
  const allowedByExtension = ACCEPTED_EXTENSIONS.includes(extension);
  const allowedByMime = mime !== "" && ACCEPTED_MIME_TYPES.includes(mime);

  if (!allowedByExtension && !allowedByMime) {
    return "Formato inválido. O sistema aceita apenas JPG, PNG, TIFF e WebP.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Arquivo maior que 50 MB. Selecione uma versão menor antes de enviar.";
  }

  return null;
}

function extractUploadErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Falha ao enviar imagem.";
  }

  const data = error.response?.data as
    | { detail?: unknown; message?: unknown; error?: unknown }
    | string
    | undefined;

  if (typeof data === "string") {
    return data;
  }

  const detail = data?.detail ?? data?.message ?? data?.error;

  if (Array.isArray(detail)) {
    const mensagem = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const candidate = item as { msg?: unknown; message?: unknown; detail?: unknown };
          return typeof candidate.msg === "string"
            ? candidate.msg
            : typeof candidate.message === "string"
              ? candidate.message
              : typeof candidate.detail === "string"
                ? candidate.detail
                : "";
        }

        return "";
      })
      .filter(Boolean)
      .join(" ");

    if (mensagem.trim()) {
      return mensagem;
    }
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "Falha ao enviar imagem.";
}

function isSameFile(a: UploadFileLike, b: UploadFileLike) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

const DUPLICATE_QUEUE_MESSAGE = "Arquivo duplicado já está na fila.";

function shouldShowGpsUi(item: UploadItem) {
  return validateFile(item.file) === null && item.message !== DUPLICATE_QUEUE_MESSAGE;
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

function itemNeedsManualLocation(item: UploadItem) {
  return shouldShowGpsUi(item) && item.hasLocation === false;
}

function isManualLocationResolved(item: UploadItem) {
  if (item.locationException) return true;
  return parseLatitude(item.manualLat) !== null && parseLongitude(item.manualLng) !== null;
}

function applyManualCoordinateDraft(
  current: UploadItem, 
  latitudeText?: string, 
  longitudeText?: string
): UploadItem {
  const manualLat = latitudeText !== undefined ? latitudeText : current.manualLat;
  const manualLng = longitudeText !== undefined ? longitudeText : current.manualLng;
  const manualReady = isCompleteManualCoordinatePair(manualLat, manualLng);
  
  const msgText: string = manualReady 
    ? "Coordenadas manuais preenchidas." 
    : "Aguardando coordenadas manuais.";

  return {
    ...current,
    manualLat,
    manualLng,
    locationException: null,
    hasLocation: false, 
    locationSource: manualReady ? ("manual" as const) : null,
    message: msgText, 
  };
}

async function deriveMetadataFromFile(file: File | UploadFileLike): Promise<{ hasLocation: boolean; isoDate: string | null }> {
  if (!("arrayBuffer" in file)) return { hasLocation: false, isoDate: null };
  try {
    const [gps, exif] = await Promise.all([
      exifr.gps(file as File).catch(() => null),
      exifr.parse(file as File, ["DateTimeOriginal", "CreateDate", "DateTime"]).catch(() => null),
    ]);

    const lat = gps?.latitude;
    const lng = gps?.longitude;
    const hasLocation =
      typeof lat === "number" && typeof lng === "number" &&
      Number.isFinite(lat) && Number.isFinite(lng);

    const rawDate = exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.DateTime ?? null;
    let isoDate: string | null = null;
    if (rawDate) {
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (!isNaN(d.getTime())) {
        isoDate = d.toISOString().slice(0, 10); 
      }
    }

    return { hasLocation, isoDate };
  } catch {
    return { hasLocation: false, isoDate: null };
  }
}

function getProgressWidthClass(progress: number) {
  if (progress <= 0) return "w-0";
  if (progress <= 10) return "w-[10%]";
  if (progress <= 20) return "w-[20%]";
  if (progress <= 30) return "w-[30%]";
  if (progress <= 40) return "w-[40%]";
  if (progress <= 50) return "w-[50%]";
  if (progress <= 60) return "w-[60%]";
  if (progress <= 70) return "w-[70%]";
  if (progress <= 80) return "w-[80%]";
  if (progress <= 90) return "w-[90%]";
  return "w-full";
}

function readLaudoIdFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("laudoId")?.trim() || null;
}

function resolveInspecaoIdForUpload(laudoIdFromUrl: string | null, inspecaoIdRef: MutableRefObject<string | null>): string | null {
  const fromUrl = readLaudoIdFromUrl() ?? laudoIdFromUrl;
  const fromStorage =
    typeof window !== "undefined" ? window.sessionStorage.getItem(INSPECTION_ID_KEY)?.trim() || null : null;
  return inspecaoIdRef.current ?? fromUrl ?? fromStorage;
}

const FOTO_UPLOAD_ENDPOINT = "/api/fotos/upload-multiplas";

interface UploadItemRowProps {
  item: UploadItem;
  updateQueueItem: (itemId: string, updater: (current: UploadItem) => UploadItem) => void;
  onRemove: (item: UploadItem) => void;
}

function UploadItemRow({ item, updateQueueItem, onRemove }: UploadItemRowProps) {
  const isUploading = item.status === 'uploading';
  const isCompleted = item.status === 'completed';
  const isRejected = item.status === 'rejected';
  const locationSource = item.locationSource ?? (item.hasLocation ? "gps" : null);

  const latInvalid = useMemo(() => 
    itemNeedsManualLocation(item) && !item.locationException && item.manualLat.trim() !== "" && parseLatitude(item.manualLat) === null,
    [item]
  );
  const lngInvalid = useMemo(() => 
    itemNeedsManualLocation(item) && !item.locationException && item.manualLng.trim() !== "" && parseLongitude(item.manualLng) === null,
    [item]
  );

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-3 ${isRejected ? 'border-red-200 bg-red-50' : isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:flex-1">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${isRejected ? 'border-red-200 bg-white' : 'border-gray-200 bg-gray-100'}`}>
            {item.previewUrl ? (
              <Image src={item.previewUrl} alt={item.file.name} width={48} height={48} unoptimized className="h-full w-full object-cover" />
            ) : (
              <Upload size={18} className="text-gray-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">{item.file.name}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.2em] ${isRejected ? 'border-red-200 bg-white text-red-600' : isCompleted ? 'border-emerald-200 bg-white text-emerald-700' : isUploading ? 'border-blue-200 bg-white text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                {isRejected ? 'Pendente' : isCompleted ? 'Concluído' : isUploading ? 'Enviando' : "Na fila"}
              </span>
            </div>

            <p className={`mt-1 text-xs ${isRejected ? 'text-red-600' : 'text-gray-500'}`}>
              {isRejected ? item.message : `${getFileKindLabel(item.file)} • ${formatBytes(item.file.size)}`}
            </p>

            {shouldShowGpsUi(item) ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {item.hasLocation === null ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" aria-hidden />
                    <span className="text-gray-500">Verificando metadados de localização...</span>
                  </>
                ) : null}
                {item.status === 'completed' && locationSource === "manual" ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    <span className="font-semibold text-emerald-700">Localização informada</span>
                  </>
                ) : null}
                {item.status === 'completed' && locationSource === "gps" ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    <span className="font-semibold text-emerald-700">Localização identificada via GPS</span>
                  </>
                ) : null}
                {item.hasLocation === false ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                    <span className="font-semibold text-amber-700">Requer intervenção</span>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full transition-all ${isRejected ? 'bg-red-400 w-full' : isCompleted ? 'bg-emerald-500 w-full' : `bg-[#0a5483] ${getProgressWidthClass(item.progress)}`}`} />
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              {isUploading ? <Upload size={13} className="text-blue-600" /> : isCompleted ? <CheckCircle2 size={13} className="text-emerald-600" /> : isRejected ? <CheckCircle2 size={13} className="text-red-600" /> : <CheckCircle2 size={13} className="text-gray-400" />}
              <span>{item.message}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => onRemove(item)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
            aria-label={`Remover ${item.file.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {itemNeedsManualLocation(item) ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-3 space-y-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-900/80">
            Pendentes de localização — coordenadas manuais
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`lat-${item.id}`} className="mb-1 block text-xs font-semibold text-gray-700">
                Latitude
              </label>
              <input
                id={`lat-${item.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                disabled={!!item.locationException}
                value={item.manualLat}
                onChange={(e) => {
                  const v = filterCoordInput(e.target.value);
                  updateQueueItem(item.id, (c) => applyManualCoordinateDraft(c, v, undefined));
                }}
                placeholder="-23,5505"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30 disabled:cursor-not-allowed disabled:bg-gray-100 ${latInvalid ? "border-red-400 focus:ring-red-200" : "border-gray-200"}`}
              />
              {latInvalid && (
                <p className="mt-1 text-[11px] font-medium text-red-600 animate-fade-in">
                  Latitude inválida. Use números decimais entre −90 e 90.
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`lng-${item.id}`} className="mb-1 block text-xs font-semibold text-gray-700">
                Longitude
              </label>
              <input
                id={`lng-${item.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                disabled={!!item.locationException}
                value={item.manualLng}
                onChange={(e) => {
                  const v = filterCoordInput(e.target.value);
                  updateQueueItem(item.id, (c) => applyManualCoordinateDraft(c, undefined, v));
                }}
                placeholder="-46,6333"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30 disabled:cursor-not-allowed disabled:bg-gray-100 ${lngInvalid ? "border-red-400 focus:ring-red-200" : "border-gray-200"}`}
              />
              {lngInvalid && (
                <p className="mt-1 text-[11px] font-medium text-red-600 animate-fade-in">
                  Longitude inválida. Use números decimais entre −180 e 180.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-gray-600">Sem dados de posição?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateQueueItem(item.id, (c) => ({
                    ...c,
                    locationException: c.locationException === "sem_gps" ? null : "sem_gps",
                    manualLat: "",
                    manualLng: "",
                    locationSource: null,
                  }))
                }
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  item.locationException === "sem_gps"
                    ? "border-[#0a5483] bg-[#0a5483] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                Sem GPS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UploadImagensConteudo() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const laudoIdParam = searchParams.get("laudoId")?.trim() || null;
  const [laudoIdFromUrl, setLaudoIdFromUrl] = useState<string | null>(null);
  const inspecaoIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showPopUp, setShowPopUp] = useState(false);
  const [initialUserState] = useState<UserState>(() => getInitialUserState());
  const [usuarioNome] = useState(initialUserState.nome);
  const [cargoUsuario] = useState(initialUserState.cargo);
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(UPLOAD_QUEUE_STORAGE_KEY);
    }
    return [];
  });

  const uploadsEmAndamentoRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    const fromStorage =
      typeof window !== "undefined" ? window.sessionStorage.getItem(INSPECTION_ID_KEY)?.trim() || null : null;
    const resolvedId = laudoIdParam ?? readLaudoIdFromUrl() ?? fromStorage;

    setLaudoIdFromUrl(resolvedId);
    inspecaoIdRef.current = resolvedId;

    if (laudoIdParam && typeof window !== "undefined") {
      window.sessionStorage.setItem(INSPECTION_ID_KEY, laudoIdParam);
    }
  }, [laudoIdParam]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(UPLOAD_QUEUE_STORAGE_KEY);
      }
      clearConfirmationSummary();
      itemsRef.current.forEach((item) => {
        if (isBlobUrl(item.previewUrl)) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const totalSelectedSize = useMemo(() => items.reduce((sum, item) => sum + item.file.size, 0), [items]);

  const arquivosSemCoordenadas = useMemo(
    () => items.filter((item) => item.hasLocation === false && shouldShowGpsUi(item)).length,
    [items]
  );

  const podeMapearCoordenadas = useMemo(() => {
    let temArquivoRelevante = false;
    for (const item of items) {
      if (!shouldShowGpsUi(item)) continue;
      temArquivoRelevante = true;
      if (item.hasLocation === null) return false;
      if (item.hasLocation === false && !isManualLocationResolved(item)) return false;
    }
    return temArquivoRelevante;
  }, [items]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    persistUploadQueue(items);
  }, [items]);

  useEffect(() => {
    return undefined;
  }, []);

  function cleanupItem(item: UploadItem) {
    if (isBlobUrl(item.previewUrl)) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }

  const clearQueue = useCallback(() => {
    setItems((current) => {
      current.forEach((item) => {
        if (isBlobUrl(item.previewUrl)) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      window.sessionStorage.removeItem(UPLOAD_QUEUE_STORAGE_KEY);
      return [];
    });
  }, []);

  const updateQueueItem = useCallback((itemId: string, updater: (current: UploadItem) => UploadItem) => {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  }, []);

  const prepareReviewItems = useCallback(async () => {
    const persistedById = new globalThis.Map(readPersistedReviewItems().map((item) => [item.id, item]));

    const reviewItems = await Promise.all(
      items.map(async (item) => {
        const persistedReview = persistedById.get(item.id);
        const durableImageUrl = item.serverImageUrl ?? (item.originalFile ? await fileToDataUrl(item.originalFile) : item.previewUrl);

        return {
          id: item.id,
          fotoId: persistedReview?.fotoId ?? item.serverFotoId,
          fileName: item.file.name,
          imageUrl: persistedReview?.imageUrl ?? durableImageUrl,
          latitude: persistedReview?.latitude ?? item.serverLatitude,
          longitude: persistedReview?.longitude ?? item.serverLongitude,
          locationSource: persistedReview?.locationSource ?? item.locationSource,
          manualLat: item.manualLat,
          manualLng: item.manualLng,
          locationException: persistedReview?.locationException ?? item.locationException,
          status: item.status === "completed" ? "ready" : item.status,
          message: persistedReview?.note ?? item.message,
        };
      })
    );

    const normalizedReviewItems = buildReviewPayloadFromUpload(reviewItems);

    clearConfirmationSummary();
    if (normalizedReviewItems.length > 0) {
      persistReviewItems(normalizedReviewItems);
    }

    return normalizedReviewItems;
  }, [items]);

  const uploadPendingBatch = useCallback(async (batchItems: UploadItem[]) => {
    const selectedForUpload = batchItems
      .map((item) => ({ item, file: resolveOriginalFile(item) }))
      .filter((entry): entry is { item: UploadItem; file: File } => entry.file instanceof File);

    batchItems
      .filter((item) => !selectedForUpload.some((entry) => entry.item.id === item.id))
      .forEach((item) => {
        updateQueueItem(item.id, (current) => ({
          ...current,
          status: "rejected",
          progress: 0,
          message: "Arquivo original indisponível para reenvio. Selecione a imagem novamente.",
        }));
      });

    if (!selectedForUpload.length) {
      return;
    }

    selectedForUpload.forEach(({ item }) => {
      updateQueueItem(item.id, (current) => ({
        ...current,
        status: "uploading",
        progress: 0,
        message: "Enviando lote para processamento",
      }));
    });

    const inspecaoId = resolveInspecaoIdForUpload(laudoIdFromUrl, inspecaoIdRef);

    const formData = new FormData();
    selectedForUpload.forEach(({ file }) => {
      formData.append("files", file);
    });
    if (inspecaoId) {
      formData.append("inspecao_id", inspecaoId);
    }

    const uploadUrl = inspecaoId
      ? `${FOTO_UPLOAD_ENDPOINT}?inspecao_id=${encodeURIComponent(inspecaoId)}`
      : FOTO_UPLOAD_ENDPOINT;

    try {
      const response = await authApi.post(uploadUrl, formData, {
        headers: inspecaoId ? { "X-Inspecao-Id": inspecaoId } : undefined,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) {
            return;
          }

          const progress = Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total));
          selectedForUpload.forEach(({ item }) => {
            updateQueueItem(item.id, (current) => ({
              ...current,
              status: "uploading",
              progress,
              message: `Enviado com sucesso ${progress}%`,
            }));
          });
        },
      });

      const resultadoUpload = response.data as {
        success?: Array<{ id?: number; filename?: string; caminho_arquivo?: string; latitude?: number; longitude?: number; trecho_id?: string }>;
        failed?: Array<{ id?: number; filename?: string; reason?: string; image_url?: string }>;
        trecho?: { id_trecho?: string; foto_ids?: number[] };
      };

      const successByFilename = new globalThis.Map<string, Array<{ id?: number; filename?: string; caminho_arquivo?: string; latitude?: number; longitude?: number; trecho_id?: string }>>();
      (resultadoUpload.success ?? []).forEach((item) => {
        if (typeof item.filename !== "string" || item.filename.trim() === "") {
          return;
        }
        const bucket = successByFilename.get(item.filename) ?? [];
        bucket.push(item);
        successByFilename.set(item.filename, bucket);
      });

      const failedByFilename = new globalThis.Map<string, Array<{ id?: number; filename?: string; reason?: string; image_url?: string }>>();
      (resultadoUpload.failed ?? []).forEach((item) => {
        if (typeof item.filename !== "string" || item.filename.trim() === "") {
          return;
        }
        const bucket = failedByFilename.get(item.filename) ?? [];
        bucket.push(item);
        failedByFilename.set(item.filename, bucket);
      });

      selectedForUpload.forEach(({ item }) => {
        const successBucket = successByFilename.get(item.file.name) ?? [];
        const fotoEnviada = successBucket.shift();
        successByFilename.set(item.file.name, successBucket);
        if (fotoEnviada) {
          updateQueueItem(item.id, (current) => ({
            ...current,
            serverFotoId: typeof fotoEnviada.id === "number" && Number.isFinite(fotoEnviada.id) ? fotoEnviada.id : current.serverFotoId,
            serverImageUrl: fotoEnviada.caminho_arquivo ?? current.serverImageUrl,
            serverLatitude: typeof fotoEnviada.latitude === "number" ? fotoEnviada.latitude : current.serverLatitude,
            serverLongitude: typeof fotoEnviada.longitude === "number" ? fotoEnviada.longitude : current.serverLongitude,
            status: "completed",
            progress: 100,
            message: "Enviado com sucesso",
          }));
          return;
        }

        const failedBucket = failedByFilename.get(item.file.name) ?? [];
        const falhaUpload = failedBucket.shift();
        failedByFilename.set(item.file.name, failedBucket);
        updateQueueItem(item.id, (current) => ({
          ...current,
          serverFotoId: typeof falhaUpload?.id === "number" && Number.isFinite(falhaUpload.id) ? falhaUpload.id : current.serverFotoId,
          serverImageUrl: falhaUpload?.image_url ?? current.serverImageUrl,
          status: "rejected",
          progress: 0,
          message: falhaUpload?.reason ?? "Falha ao enviar imagem.",
        }));
      });
    } catch (error) {
      const mensagemErro = extractUploadErrorMessage(error);
      selectedForUpload.forEach(({ item }) => {
        updateQueueItem(item.id, (current) => ({
          ...current,
          status: "rejected",
          progress: 0,
          message: mensagemErro,
        }));
      });
    }
  }, [updateQueueItem, laudoIdFromUrl]);

  useEffect(() => {
    const pendingItems = items.filter(
      (item) => item.status === "pending" && !uploadsEmAndamentoRef.current.has(item.id)
    );

    if (!pendingItems.length) {
      return;
    }

    pendingItems.forEach((item) => uploadsEmAndamentoRef.current.add(item.id));

    void uploadPendingBatch(pendingItems).finally(() => {
      pendingItems.forEach((item) => uploadsEmAndamentoRef.current.delete(item.id));
    });
  }, [items, uploadPendingBatch]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);

    if (!incoming.length) {
      return;
    }

    const nextItems: UploadItem[] = [];

    incoming.forEach((file) => {
      const validationError = validateFile(file);
      const duplicate = items.some((item) => isSameFile(item.file, file)) || nextItems.some((item) => isSameFile(item.file, file));
      const id = createId(file);

      if (validationError) {
        nextItems.push({
          id,
          serverFotoId: null,
          file: toUploadFileLike(file),
          originalFile: file,
          previewUrl: URL.createObjectURL(file),
          serverImageUrl: null,
          serverLatitude: null,
          serverLongitude: null,
          status: "rejected",
          progress: 0,
          message: validationError,
          hasLocation: null,
          locationSource: null,
          manualLat: "",
          manualLng: "",
          locationException: null,
        });
        return;
      }

      if (duplicate) {
        nextItems.push({
          id,
          serverFotoId: null,
          file: toUploadFileLike(file),
          originalFile: file,
          previewUrl: URL.createObjectURL(file),
          serverImageUrl: null,
          serverLatitude: null,
          serverLongitude: null,
          status: "rejected",
          progress: 0,
          message: DUPLICATE_QUEUE_MESSAGE,
          hasLocation: null,
          locationSource: null,
          manualLat: "",
          manualLng: "",
          locationException: null,
        });
        return;
      }

      nextItems.push({
        id,
        serverFotoId: null,
        file: toUploadFileLike(file),
        originalFile: file,
        previewUrl: URL.createObjectURL(file),
        serverImageUrl: null,
        serverLatitude: null,
        serverLongitude: null,
        status: "pending",
        progress: 0,
        message: "Aguardando envio",
        hasLocation: null,
        locationSource: null,
        manualLat: "",
        manualLng: "",
        locationException: null,
      });
    });

    setItems((current) => [...current, ...nextItems]);

    nextItems.forEach((item) => {
      if (item.originalFile) {
        originalFileCache.set(item.id, item.originalFile);
      }
    });

    let dataPatchDisparado = false;

    void Promise.resolve().then(() => {
      nextItems.forEach((item) => {
        if (item.status !== "pending" || item.hasLocation !== null) return;
        void deriveMetadataFromFile(resolveOriginalFile(item) ?? item.file).then(({ hasLocation, isoDate }) => {
          updateQueueItem(item.id, (current) => ({
            ...current,
            hasLocation,
            locationSource: hasLocation ? "gps" : current.locationSource,
          }));

          const laudoIdParaAtualizar = resolveInspecaoIdForUpload(laudoIdFromUrl, inspecaoIdRef);
          if (isoDate && laudoIdParaAtualizar && !dataPatchDisparado) {
            dataPatchDisparado = true;
            void authApi.patch(`/api/laudos/${laudoIdParaAtualizar}/`, { data: isoDate }).catch(() => {});
          }
        });
      });
    });
  }

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

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
            { Icon: MapIcon, label: "Mapa", href: "/mapa" },
            { Icon: History, label: "Histórico", href: "/historico" },
          ].map(({ Icon, label, href }) => {
            const isActive = pathname === href;

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
                    router.push('/editar-perfil');
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
              <Upload size={20} className="text-gray-600" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Upload de Imagens</h2>
                <p className="text-xs text-gray-500 font-medium italic mt-0.5">Inspeção e georreferenciamento de vias</p>
              </div>
            </div>

            {/* AVISO DE PENDÊNCIA (US-11 / CT-072) */}
            {arquivosSemCoordenadas > 0 && (
              <div className="mb-8 flex w-full flex-col items-center justify-center rounded-xl bg-[#FFF3F3] px-6 py-5 border border-red-100 shadow-sm transition-all animate-in fade-in duration-200">
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#E50000] text-[14px] font-extrabold text-white">
                    !
                  </div>
                  <h3 className="text-xl font-bold text-[#E50000]">
                    Pendência em imagens na fila
                  </h3>
                </div>
                <p className="text-[15px] font-medium text-[#E50000]">
                  Insira as coordenadas manualmente ou selecione um motivo (”Sem GPS” ou ”EXIF Corrompido”) para prosseguir.
                </p>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${isDragging ? 'border-[#0a5483] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white border border-gray-200 text-[#0a5483] shadow-sm">
                <Upload size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Arraste as imagens da via aqui</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-2xl mx-auto">
                Formatos aceitos: JPG, PNG, TIFF (Máx. 50MB por arquivo)
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  inputRef.current?.click();
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0a5483] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083d61]"
              >
                Selecionar arquivos
                <ChevronRight size={16} />
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.tif,.tiff,.webp,image/jpeg,image/png,image/tiff,image/webp"
              aria-label="Selecionar imagens para upload"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Fila de Upload</h3>
                  <p className="text-sm text-gray-500 mt-1">{items.length} arquivo(s) na fila • {formatBytes(totalSelectedSize)} total</p>
                </div>
                <button
                  type="button"
                  onClick={clearQueue}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100"
                >
                  Limpar fila
                </button>
              </div>

              <div className="p-4">
                {arquivosSemCoordenadas > 0 ? (
                  <div className="mb-4 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                    <Info className="h-5 w-5 shrink-0 text-sky-600" aria-hidden />
                    <div>
                      <p className="font-bold text-sky-950">Georreferenciamento manual</p>
                      <p className="mt-1 text-sky-900/90">
                        {arquivosSemCoordenadas === 1
                          ? "1 arquivo selecionado não possui coordenadas GPS nos metadados (EXIF/XMP). Você poderá informar a localização manualmente no mapa no próximo passo."
                          : `${arquivosSemCoordenadas} arquivos selecionados não possuem coordenadas GPS nos metadados (EXIF/XMP). Você poderá informar a localização manualmente no mapa no próximo passo.`}
                      </p>
                    </div>
                  </div>
                ) : null}
                {!items.length ? (
                  <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                    Nenhum arquivo selecionado ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const isUploading = item.status === 'uploading';
                      const isCompleted = item.status === 'completed';
                      const isRejected = item.status === 'rejected';
                      const locationSource = item.locationSource ?? (item.hasLocation ? "gps" : null);

                      const latInvalid =
                        itemNeedsManualLocation(item) &&
                        !item.locationException &&
                        item.manualLat.trim() !== "" &&
                        parseLatitude(item.manualLat) === null;
                      const lngInvalid =
                        itemNeedsManualLocation(item) &&
                        !item.locationException &&
                        item.manualLng.trim() !== "" &&
                        parseLongitude(item.manualLng) === null;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col gap-3 rounded-2xl border p-3 ${isRejected ? 'border-red-200 bg-red-50' : isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3 sm:flex-1">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${isRejected ? 'border-red-200 bg-white' : 'border-gray-200 bg-gray-100'}`}>
                              {item.previewUrl ? (
                                <Image src={item.previewUrl} alt={item.file.name} width={48} height={48} unoptimized className="h-full w-full object-cover" />
                              ) : (
                                <Upload size={18} className="text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-bold text-gray-900">{item.file.name}</p>
                                <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.2em] ${isRejected ? 'border-red-200 bg-white text-red-600' : isCompleted ? 'border-emerald-200 bg-white text-emerald-700' : isUploading ? 'border-blue-200 bg-white text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                                  {isRejected ? 'Pendente' : isCompleted ? 'Concluído' : isUploading ? 'Enviando' : "Na fila"}
                                </span>
                              </div>

                              <p className={`mt-1 text-xs ${isRejected ? 'text-red-600' : 'text-gray-500'}`}>
                                {isRejected ? item.message : `${getFileKindLabel(item.file)} • ${formatBytes(item.file.size)}`}
                              </p>

                              {shouldShowGpsUi(item) ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  {item.hasLocation === null ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" aria-hidden />
                                      <span className="text-gray-500">Verificando metadados de localização...</span>
                                    </>
                                  ) : null}
                                  {item.status === 'completed' && locationSource === "manual" ? (
                                    <>
                                      <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                                      <span className="font-semibold text-emerald-700">Localização informada</span>
                                    </>
                                  ) : null}
                                  {item.status === 'completed' && locationSource === "gps" ? (
                                    <>
                                      <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                                      <span className="font-semibold text-emerald-700">Localização identificada via GPS</span>
                                    </>
                                  ) : null}
                                  {item.hasLocation === false ? (
                                    <>
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                                      <span className="font-semibold text-amber-700">Requer intervenção</span>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full rounded-full transition-all ${isRejected ? 'bg-red-400 w-full' : isCompleted ? 'bg-emerald-500 w-full' : `bg-[#0a5483] ${getProgressWidthClass(item.progress)}`}`}
                                />
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                {isUploading ? <Upload size={13} className="text-blue-600" /> : isCompleted ? <CheckCircle2 size={13} className="text-emerald-600" /> : isRejected ? <CheckCircle2 size={13} className="text-red-600" /> : <CheckCircle2 size={13} className="text-gray-400" />}
                                <span>{item.message}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 sm:w-auto sm:shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.status === 'uploading') {
                                  return;
                                }

                                setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
                                cleanupItem(item);
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remover ${item.file.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          </div>

                          {itemNeedsManualLocation(item) ? (
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-3 space-y-3">
                              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-900/80">
                                Pendentes de localização — coordenadas manuais
                              </p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label htmlFor={`lat-${item.id}`} className="mb-1 block text-xs font-semibold text-gray-700">
                                    Latitude
                                  </label>
                                  <input
                                    id={`lat-${item.id}`}
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    disabled={!!item.locationException}
                                    value={item.manualLat}
                                    onChange={(e) => {
                                      const v = filterCoordInput(e.target.value);
                                      updateQueueItem(item.id, (c) => ({
                                        ...c,
                                        manualLat: v,
                                        locationException: null,
                                        hasLocation: isCompleteManualCoordinatePair(v, c.manualLng) ? true : false,
                                        locationSource: isCompleteManualCoordinatePair(v, c.manualLng) ? "manual" : c.locationSource,
                                        status:
                                          c.status === "rejected"
                                            ? c.status
                                            : "pending",
                                        progress:
                                          c.status === "rejected"
                                            ? c.progress
                                            : 0,
                                        message: c.status === "rejected"
                                          ? c.message
                                          : isCompleteManualCoordinatePair(v, c.manualLng)
                                            ? "Coordenadas manuais preenchidas."
                                            : "Aguardando coordenadas manuais.",
                                      }));
                                    }}
                                    placeholder="-23,5505"
                                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30 disabled:cursor-not-allowed disabled:bg-gray-100 ${latInvalid ? "border-red-400" : "border-gray-200"}`}
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`lng-${item.id}`} className="mb-1 block text-xs font-semibold text-gray-700">
                                    Longitude
                                  </label>
                                  <input
                                    id={`lng-${item.id}`}
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    disabled={!!item.locationException}
                                    value={item.manualLng}
                                    onChange={(e) => {
                                      const v = filterCoordInput(e.target.value);
                                      updateQueueItem(item.id, (c) => ({
                                        ...c,
                                        manualLng: v,
                                        locationException: null,
                                        hasLocation: isCompleteManualCoordinatePair(c.manualLat, v) ? true : false,
                                        locationSource: isCompleteManualCoordinatePair(c.manualLat, v) ? "manual" : c.locationSource,
                                        status:
                                          c.status === "rejected"
                                            ? c.status
                                            : "pending",
                                        progress:
                                          c.status === "rejected"
                                            ? c.progress
                                            : 0,
                                        message: c.status === "rejected"
                                          ? c.message
                                          : isCompleteManualCoordinatePair(c.manualLat, v)
                                            ? "Coordenadas manuais preenchidas."
                                            : "Aguardando coordenadas manuais.",
                                      }));
                                    }}
                                    placeholder="-46,6333"
                                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30 disabled:cursor-not-allowed disabled:bg-gray-100 ${lngInvalid ? "border-red-400" : "border-gray-200"}`}
                                  />
                                </div>
                              </div>
                              {(latInvalid || lngInvalid) ? (
                                <p className="text-xs font-medium text-red-600">Use apenas números decimais. Latitude −90 a 90; longitude −180 a 180.</p>
                              ) : null}
                              <div>
                                <p className="mb-2 text-xs font-semibold text-gray-600">Sem dados de posição?</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQueueItem(item.id, (c) => ({
                                        ...c,
                                        locationException: c.locationException === "sem_gps" ? null : "sem_gps",
                                        manualLat: "",
                                        manualLng: "",
                                        locationSource: null,
                                      }))
                                    }
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                      item.locationException === "sem_gps"
                                        ? "border-[#0a5483] bg-[#0a5483] text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                    }`}
                                  >
                                    Sem GPS
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                disabled={!podeMapearCoordenadas || arquivosSemCoordenadas > 0}
                onClick={() => {
                  void prepareReviewItems().finally(() => {
                    router.push("/mapa");                 
                  });
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-bold uppercase tracking-wide transition ${
                  podeMapearCoordenadas && arquivosSemCoordenadas === 0
                    ? "bg-[#0a5483] text-white shadow-sm hover:bg-[#083d61] cursor-pointer"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                {arquivosSemCoordenadas > 0 ? (
                  <>
                    <AlertTriangle size={16} className="text-gray-400" />
                    Resolva as pendências para prosseguir
                  </>
                ) : (
                  <>
                    Mapear coordenadas
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function UploadImagensPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#0a5483]" />
          <p className="text-sm font-medium text-gray-500">Carregando gerenciador de upload...</p>
        </div>
      </div>
    }>
      <UploadImagensConteudo />
    </Suspense>
  );
}
