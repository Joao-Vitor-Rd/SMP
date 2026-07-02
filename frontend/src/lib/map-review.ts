import axios from "axios";

import { SessionExpiredError, authApi } from "./authApi";

export type MapReviewLocationSource = "gps" | "manual" | "fallback";

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

      const imageUrl = String(raw.imageUrl ?? raw.image_url ?? raw.caminho_arquivo ?? "");

      let detectedFileName = raw.fileName ?? raw.filename ?? raw.nome_original_arquivo ?? raw.name;

      if (!detectedFileName && imageUrl && imageUrl.includes("/")) {
        const partesDoLink = imageUrl.split("/");
        const possivelNome = partesDoLink[partesDoLink.length - 1];
        if (possivelNome && !possivelNome.startsWith("blob:")) {
          detectedFileName = possivelNome;
        }
      }

      const fileName = String(detectedFileName || `Foto-${fotoId || index + 1}.jpg`);

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
  const stored = readPersistedReviewItems();
  if (stored.length > 0) {
    return stored;
  }

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
  }

  return [];
}

export async function saveInspectionPosition(itemId: string, latitude: number, longitude: number, fotoId?: number | null) {
  try {
    if (typeof fotoId === "number" && Number.isFinite(fotoId)) {
      await authApi.patch(`/api/fotos/revisao-mapa/${fotoId}`, { latitude, longitude });
      return;
    }
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
        status: "confirmed",
        updatedAt: now,
        note: "Coordenadas ajustadas manualmente.",
      };
      persistReviewItems(stored);
      return;
    }

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
        status: "confirmed",
        note: "Coordenadas ajustadas manualmente.",
        updatedAt: now,
      },
    ]);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }
  }
}

export async function confirmReviewOnServer(items: MapReviewInspection[]) {
  try {
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
  }

  persistConfirmationSummary({
    confirmedAt: new Date().toISOString(),
    total: items.length,
  });
}

export function formatCoordinate(value: number | null) {
  return value === null ? "--" : value.toFixed(6);
}