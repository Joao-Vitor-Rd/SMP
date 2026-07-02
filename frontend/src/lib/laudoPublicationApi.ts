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

export async function publishLaudo(
  inspecaoId: string | number,
  payload: PublishLaudoPayload
): Promise<LaudoPublicado> {
  try {
    const response = await authApi.post(
      `${LAUDOS_API_BASE}/${inspecaoId}/publicar`,
      payload
    );

    return response.data as LaudoPublicado;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Não foi possível publicar o laudo.";
      throw new Error(message);
    }

    throw error;
  }
}
