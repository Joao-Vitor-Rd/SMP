import axios from "axios";

import { SessionExpiredError, authApi } from "./authApi";

export type TrechoBoundingBox = {
  topLeftLat: number;
  topLeftLng: number;
  bottomRightLat: number;
  bottomRightLng: number;
};

export type TrechoFoto = {
  id: number;
  caminho_arquivo: string;
  latitude: number | null;
  longitude: number | null;
};

export type TrechoListItem = {
  id_trecho: string;
  criado_em: string | null;
  foto_ids: number[];
  fotos: TrechoFoto[];
  pci?: number;
};

export type TrechoListResponse = {
  items: TrechoListItem[];
};

const TRECHOS_API_ENDPOINT = "/api/trechos";
const TRECHOS_BOUNDS_STORAGE_KEY = "smp:trechos-bounds";
const TRECHOS_BOUNDS_UPDATED_EVENT = "smp:trechos-bounds-updated";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeTrechoFoto(raw: Record<string, unknown>): TrechoFoto | null {
  const id = typeof raw.id === "number" && Number.isFinite(raw.id) ? raw.id : null;
  const caminhoArquivo = typeof raw.caminho_arquivo === "string" ? raw.caminho_arquivo : null;

  if (id === null || !caminhoArquivo) {
    return null;
  }

  return {
    id,
    caminho_arquivo: caminhoArquivo,
    latitude: typeof raw.latitude === "number" && Number.isFinite(raw.latitude) ? raw.latitude : null,
    longitude: typeof raw.longitude === "number" && Number.isFinite(raw.longitude) ? raw.longitude : null,
  };
}

function normalizeTrechoItem(raw: Record<string, unknown>): TrechoListItem | null {
  const idTrecho = typeof raw.id_trecho === "string" ? raw.id_trecho : null;

  if (!idTrecho) {
    return null;
  }

  const fotos = Array.isArray(raw.fotos)
    ? raw.fotos
        .filter((foto): foto is Record<string, unknown> => typeof foto === "object" && foto !== null)
        .map(normalizeTrechoFoto)
        .filter((foto): foto is TrechoFoto => foto !== null)
    : [];

  const fotoIds = Array.isArray(raw.foto_ids)
    ? raw.foto_ids.filter((fotoId): fotoId is number => typeof fotoId === "number" && Number.isFinite(fotoId))
    : [];

  return {
    id_trecho: idTrecho,
    criado_em: typeof raw.criado_em === "string" ? raw.criado_em : null,
    foto_ids: fotoIds,
    fotos,
    pci: typeof raw.pci === "number" && Number.isFinite(raw.pci) ? raw.pci : undefined,
  };
}

export function persistTrechosBounds(bounds: TrechoBoundingBox | null) {
  if (!canUseStorage()) {
    return;
  }

  if (!bounds) {
    window.sessionStorage.removeItem(TRECHOS_BOUNDS_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(TRECHOS_BOUNDS_STORAGE_KEY, JSON.stringify(bounds));
  window.dispatchEvent(new Event(TRECHOS_BOUNDS_UPDATED_EVENT));
}

export function onTrechosBoundsUpdated(listener: () => void) {
  if (!canUseStorage()) {
    return () => undefined;
  }

  window.addEventListener(TRECHOS_BOUNDS_UPDATED_EVENT, listener);

  return () => {
    window.removeEventListener(TRECHOS_BOUNDS_UPDATED_EVENT, listener);
  };
}

export function readPersistedTrechosBounds(): TrechoBoundingBox | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(TRECHOS_BOUNDS_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TrechoBoundingBox>;

    if (
      typeof parsed.topLeftLat === "number" &&
      typeof parsed.topLeftLng === "number" &&
      typeof parsed.bottomRightLat === "number" &&
      typeof parsed.bottomRightLng === "number"
    ) {
      return {
        topLeftLat: parsed.topLeftLat,
        topLeftLng: parsed.topLeftLng,
        bottomRightLat: parsed.bottomRightLat,
        bottomRightLng: parsed.bottomRightLng,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function loadTrechos(bounds?: TrechoBoundingBox | null): Promise<TrechoListItem[]> {
  const params = bounds
    ? {
        topLeftLat: bounds.topLeftLat,
        topLeftLng: bounds.topLeftLng,
        bottomRightLat: bounds.bottomRightLat,
        bottomRightLng: bounds.bottomRightLng,
      }
    : undefined;

  try {
    const response = await authApi.get(TRECHOS_API_ENDPOINT, { params });
    const items = response.data?.items;

    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map(normalizeTrechoItem)
      .filter((item): item is TrechoListItem => item !== null);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }

    throw error;
  }
}