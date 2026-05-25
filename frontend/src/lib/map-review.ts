import axios from "axios";

import { SessionExpiredError, authApi } from "./authApi";

export type MapReviewLocationSource = "gps" | "manual" | "fallback" | "mock";

export type MapReviewInspection = {
  id: string;
  fotoId: number | null;
  fileName: string;
  imageUrl: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: MapReviewLocationSource;
  locationException: string | null;
  status: "pending" | "ready" | "confirmed";
  note: string;
  updatedAt: string;
};

export type MapReviewUploadSnapshot = {
  id: string;
  fotoId?: number | null;
  fileName: string;
  imageUrl: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  locationSource?: MapReviewLocationSource | null;
  manualLat: string;
  manualLng: string;
  locationException: string | null;
  status: string;
  message: string;
};

const MAP_REVIEW_STORAGE_KEY = "smp:map-review-batch";
const MAP_REVIEW_CONFIRMATION_KEY = "smp:map-review-confirmation";
const MAP_REVIEW_API_ENDPOINT = "/api/fotos/revisao-mapa";

export function resolveNumericFotoId(value: { id?: string | number | null; fotoId?: number | null }) {
  if (typeof value.fotoId === "number" && Number.isFinite(value.fotoId)) {
    return value.fotoId;
  }

  const candidate = value.id;
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim() !== "") {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function parseCoordinate(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampLatitude(latitude: number | null): number | null {
  if (latitude === null || latitude < -90 || latitude > 90) {
    return null;
  }

  return latitude;
}

function clampLongitude(longitude: number | null): number | null {
  if (longitude === null || longitude < -180 || longitude > 180) {
    return null;
  }

  return longitude;
}

function createMockPreview(title: string, accent: string, background: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="960" height="640" fill="url(#bg)" />
      <circle cx="820" cy="140" r="140" fill="${accent}" opacity="0.12" />
      <circle cx="170" cy="500" r="180" fill="${accent}" opacity="0.08" />
      <rect x="108" y="108" width="744" height="424" rx="40" fill="#ffffff" opacity="0.82" />
      <text x="160" y="254" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="800" fill="#0f172a">${title}</text>
      <text x="160" y="322" font-family="Inter, Arial, sans-serif" font-size="28" fill="#334155">Visualização de inspeção no mapa</text>
      <path d="M220 400c42-64 86-96 132-96 42 0 76 18 112 54 34 36 68 54 102 54 38 0 82-26 132-78" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function buildMockData(): MapReviewInspection[] {
  const now = new Date().toISOString();

  return [
    {
      id: "mock-1",
      fotoId: null,
      fileName: "inspecao-br101-001.jpg",
      imageUrl: createMockPreview("BR-101", "#0f766e", "#cdeef2"),
      latitude: -23.5644,
      longitude: -46.6523,
      locationSource: "gps",
      locationException: null,
      status: "ready",
      note: "Coordenadas vindas do GPS original.",
      updatedAt: now,
    },
    {
      id: "mock-2",
      fotoId: null,
      fileName: "inspecao-br101-002.jpg",
      imageUrl: createMockPreview("Manual", "#7c3aed", "#ece2ff"),
      latitude: -23.5688,
      longitude: -46.6388,
      locationSource: "manual",
      locationException: "sem_gps",
      status: "ready",
      note: "Marcador ajustado manualmente após validação.",
      updatedAt: now,
    },
    {
      id: "mock-3",
      fotoId: null,
      fileName: "inspecao-br101-003.jpg",
      imageUrl: createMockPreview("IA", "#1d4ed8", "#dbeafe"),
      latitude: -23.5597,
      longitude: -46.6429,
      locationSource: "fallback",
      locationException: "exif_corrompido",
      status: "pending",
      note: "Imagem resolvida no fluxo, aguardando confirmação final.",
      updatedAt: now,
    },
  ];
}

export function normalizeReviewItems(input: unknown): MapReviewInspection[] {
  const candidates = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? ((input as { items?: unknown; success?: unknown }).items ?? (input as { success?: unknown }).success)
      : [];

  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates
    .map((item, index): MapReviewInspection | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const id = String(raw.id ?? raw.identifier ?? `map-item-${index + 1}`);
      const fotoIdCandidate = raw.fotoId ?? raw.foto_id ?? raw.id ?? raw.identifier;
      const fotoId = typeof fotoIdCandidate === "number" && Number.isFinite(fotoIdCandidate)
        ? fotoIdCandidate
        : typeof fotoIdCandidate === "string" && fotoIdCandidate.trim() !== "" && Number.isFinite(Number(fotoIdCandidate))
          ? Number(fotoIdCandidate)
          : null;
      const fileName = String(raw.fileName ?? raw.filename ?? raw.nome_original_arquivo ?? `inspecao-${index + 1}`);
      const imageUrl = String(raw.imageUrl ?? raw.image_url ?? raw.caminho_arquivo ?? "");
      const latitude = clampLatitude(parseCoordinate(raw.latitude as number | string | null | undefined));
      const longitude = clampLongitude(parseCoordinate(raw.longitude as number | string | null | undefined));
      const locationException = typeof raw.locationException === "string"
        ? raw.locationException
        : typeof raw.location_exception === "string"
          ? raw.location_exception
          : null;
      const status = raw.status === "confirmed" ? "confirmed" : raw.status === "pending" ? "pending" : "ready";
      const locationSource = raw.locationSource === "manual"
        ? "manual"
        : raw.locationSource === "fallback"
          ? "fallback"
          : raw.locationSource === "mock"
            ? "mock"
            : "gps";

      if (!imageUrl) {
        return null;
      }

      return {
        id,
        fotoId,
        fileName,
        imageUrl,
        latitude,
        longitude,
        locationSource,
        locationException,
        status,
        note: String(raw.note ?? raw.message ?? raw.reason ?? "Inspeção pronta para revisão."),
        updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
      } satisfies MapReviewInspection;
    })
    .filter((item): item is MapReviewInspection => item !== null);
}

export function buildReviewPayloadFromUpload(items: MapReviewUploadSnapshot[]): MapReviewInspection[] {
  return items
    .map((item): MapReviewInspection | null => {
      const latitude = clampLatitude(parseCoordinate(item.manualLat) ?? parseCoordinate(item.latitude));
      const longitude = clampLongitude(parseCoordinate(item.manualLng) ?? parseCoordinate(item.longitude));
      const imageUrl = item.imageUrl?.trim();
      const numericId = Number(item.fotoId ?? item.id);
      const explicitLocationSource = item.locationSource === "manual"
        ? "manual"
        : item.locationSource === "gps"
          ? "gps"
          : item.locationSource === "fallback"
            ? "fallback"
            : item.locationSource === "mock"
              ? "mock"
              : null;

      if (!imageUrl) {
        return null;
      }

      return {
        id: item.id,
        fotoId: Number.isFinite(numericId) ? numericId : null,
        fileName: item.fileName,
        imageUrl,
        latitude,
        longitude,
        locationSource: explicitLocationSource ?? (item.manualLat.trim() && item.manualLng.trim() ? "manual" : "gps"),
        locationException: item.locationException,
        status: item.status === "confirmed" ? "confirmed" : "ready",
        note: item.message,
        updatedAt: new Date().toISOString(),
      } satisfies MapReviewInspection;
    })
    .filter((item): item is MapReviewInspection => item !== null);
}

export function persistReviewItems(items: MapReviewInspection[]) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(MAP_REVIEW_STORAGE_KEY, JSON.stringify(items));
}

export function readPersistedReviewItems(): MapReviewInspection[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.sessionStorage.getItem(MAP_REVIEW_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return normalizeReviewItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function clearPersistedReviewItems() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(MAP_REVIEW_STORAGE_KEY);
}

export function clearConfirmationSummary() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(MAP_REVIEW_CONFIRMATION_KEY);
}

export function persistConfirmationSummary(summary: { confirmedAt: string; total: number }) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(MAP_REVIEW_CONFIRMATION_KEY, JSON.stringify(summary));
}

export function readConfirmationSummary() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(MAP_REVIEW_CONFIRMATION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { confirmedAt?: string; total?: number };
  } catch {
    return null;
  }
}

export async function loadReviewItems(): Promise<MapReviewInspection[]> {
  try {
    const response = await authApi.get(MAP_REVIEW_API_ENDPOINT);
    const normalized = normalizeReviewItems(response.data);

    if (normalized.length > 0) {
      persistReviewItems(normalized);
      return normalized;
    }
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      // Backend ainda não expõe a rota de revisão; seguiremos com a cópia local.
    }
  }

  const stored = readPersistedReviewItems();

  if (stored.length > 0) {
    return stored;
  }

  const fallback = buildMockData();
  persistReviewItems(fallback);
  return fallback;
}

export async function saveInspectionPosition(itemId: string, latitude: number, longitude: number, fotoId?: number | null) {
  try {
    if (typeof fotoId === "number" && Number.isFinite(fotoId)) {
      await authApi.patch(`/api/fotos/revisao-mapa/${fotoId}`, { latitude, longitude });
      return;
    }
    // Se não houver `fotoId` numérico, evitar enviar o identificador do cliente
    // ao backend (que resultaria em 422/404). Persistimos localmente a revisão
    // para ser aplicada quando a foto receber `serverFotoId`.
    const stored = readPersistedReviewItems();
    const idx = stored.findIndex((it) => it.id === itemId);
    const now = new Date().toISOString();
    if (idx !== -1) {
      const current = stored[idx];
      stored[idx] = {
        ...current,
        latitude,
        longitude,
        locationSource: "manual",
        status: "ready",
        updatedAt: now,
        note: "Coordenadas ajustadas manualmente (aguardando confirmação no servidor)",
      };
      persistReviewItems(stored);
      return;
    }

    // Se o item ainda não estiver no storage local, apenas adicionar um registro mínimo.
    persistReviewItems([
      ...stored,
      {
        id: itemId,
        fotoId: null,
        fileName: "",
        imageUrl: "",
        latitude,
        longitude,
        locationSource: "manual",
        locationException: null,
        status: "ready",
        note: "Coordenadas ajustadas manualmente (aguardando confirmação no servidor)",
        updatedAt: now,
      },
    ]);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    // Fallback local while the backend endpoint is not available.
  }
}

export async function confirmReviewOnServer(items: MapReviewInspection[]) {
  try {
    // Prefer numeric server-side fotoId when available to avoid ambiguous identifiers
    const payloadItems = items.map((it) => {
      const idToSend = resolveNumericFotoId(it) ?? it.id;
      return {
        ...it,
        id: idToSend,
        fotoId: resolveNumericFotoId(it),
      };
    });

    await authApi.post(`${MAP_REVIEW_API_ENDPOINT}/confirmar`, {
      items: payloadItems,
      confirmedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    // Fallback local while the backend endpoint is not available.
  }

  persistConfirmationSummary({
    confirmedAt: new Date().toISOString(),
    total: items.length,
  });
}

export function formatCoordinate(value: number | null) {
  return value === null ? "--" : value.toFixed(6);
}