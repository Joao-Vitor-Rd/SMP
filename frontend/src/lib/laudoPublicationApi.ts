import axios from "axios";

import { SessionExpiredError, authApi } from "./authApi";
import type { DeteccaoLaudo } from "./inspectionAnalysisApi";

export type FinalizarInspecaoResumo = {
  via: string;
  km: string;
  pci: number;
  igg: number;
  observacoes?: string;
};

export type PublishLaudoPayload = {
  resumo: FinalizarInspecaoResumo;
};

export type LaudoPublicado = {
  id: string | number;
  inspecao_id: string | number;
  publicado_em: string;
  resumo: FinalizarInspecaoResumo;
  deteccoes: DeteccaoLaudo[];
};

const LAUDOS_API_BASE = "/api/laudos";

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error) || !error.response) {
    return fallback;
  }

  const detail = error.response.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown }).loc)
            ? (item as { loc: unknown[] }).loc.filter((part) => part !== "body").join(".")
            : "";
          const msg = String((item as { msg?: unknown }).msg ?? "");
          return loc ? `${loc}: ${msg}` : msg;
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return fallback;
}

export async function publishLaudo(
  inspecaoId: string | number,
  payload: PublishLaudoPayload
): Promise<LaudoPublicado> {
  try {
    const response = await authApi.post(
      `${LAUDOS_API_BASE}/${inspecaoId}/publicar`,
      payload
    );

    const data = response.data;
    if (!data || typeof data !== "object") {
      throw new Error("Resposta inválida ao publicar o laudo.");
    }

    return data as LaudoPublicado;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (error instanceof Error && error.message === "Resposta inválida ao publicar o laudo.") {
      throw error;
    }

    throw new Error(extractApiErrorMessage(error, "Não foi possível publicar o laudo."));
  }
}
