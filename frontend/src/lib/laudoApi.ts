import axios from "axios";

import { SessionExpiredError, authApi } from "./authApi";
import type { DeteccaoLaudo } from "./inspectionAnalysisApi";
import type { FinalizarInspecaoResumo } from "./laudoPublicationApi";

export type LaudoResponse = {
  id: number;
  data: string;
  responsavel: string;
  responsavel_id?: number;
  credencial_responsavel: string;
  resumo: Record<string, number>;
  publicado_em?: string | null;
  publicacao_resumo?: FinalizarInspecaoResumo | null;
  deteccoes?: DeteccaoLaudo[];
  usuarios: Array<{ id?: number; nome: string; cargo: string }>;
};

export type CreateLaudoPayload = {
  data: string;
  responsavel: string;
  credencial_responsavel: string;
  colaboradores_ids: number[];
  resumo: Record<string, unknown>;
};

const LAUDOS_API_BASE = "/api/laudos";
export const INSPECTION_ID_KEY = "smp:us14-inspecao-id";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readUsuarioFromStorage(): {
  nome?: string;
  crea?: string | null;
  cft?: string | null;
  identificador_profissional?: string | null;
} | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem("usuario");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      nome?: string;
      crea?: string | null;
      cft?: string | null;
      identificador_profissional?: string | null;
    };
  } catch {
    return null;
  }
}

function todayLocalDateString() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export async function createLaudo(payload: CreateLaudoPayload): Promise<LaudoResponse> {
  try {
    const response = await authApi.post<LaudoResponse>(`${LAUDOS_API_BASE}/`, payload);
    return response.data;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : "Não foi possível criar a inspeção.";
      throw new Error(message);
    }

    throw error;
  }
}

export async function listLaudos(): Promise<LaudoResponse[]> {
  try {
    const response = await authApi.get<LaudoResponse[]>(`${LAUDOS_API_BASE}/`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : "Não foi possível carregar os laudos.";
      throw new Error(message);
    }

    throw error;
  }
}

/**
 * Garante um ID de inspeção (laudo) ativo antes de acionar a análise por IA.
 * Reutiliza o valor em sessionStorage quando existir; caso contrário, cria um laudo mínimo.
 */
export async function ensureInspecaoId(): Promise<number> {
  if (canUseStorage()) {
    const stored = window.sessionStorage.getItem(INSPECTION_ID_KEY);
    if (stored && stored.trim() !== "") {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  const usuario = readUsuarioFromStorage();
  const laudo = await createLaudo({
    data: todayLocalDateString(),
    responsavel: usuario?.nome?.trim() || "Responsável técnico",
    credencial_responsavel:
      usuario?.crea || usuario?.cft || usuario?.identificador_profissional || "N/A",
    colaboradores_ids: [],
    resumo: {},
  });

  if (canUseStorage()) {
    window.sessionStorage.setItem(INSPECTION_ID_KEY, String(laudo.id));
  }

  return laudo.id;
}
