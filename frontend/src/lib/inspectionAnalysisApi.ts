import axios from "axios";

import { SessionExpiredError, authApi } from "./authApi";

export type DefeitoDNIT =
  | "Panelas (buracos)"
  | "Trincas isoladas"
  | "Trincas interligadas"
  | "Remendos"
  | "Desgaste superficial";

export const DEFEITOS_DNIT: DefeitoDNIT[] = [
  "Panelas (buracos)",
  "Trincas isoladas",
  "Trincas interligadas",
  "Remendos",
  "Desgaste superficial",
];

export type AnalysisJobStatus = "pending" | "completed" | "failed";

export type DeteccaoLaudo = {
  id?: string;
  defeito: DefeitoDNIT;
  confidence_score: number;
  severidade?: string;
  observacao?: string;
  imagem_id?: number | null;
  revisado_manualmente?: boolean;
};

export type Laudo = {
  inspecao_id?: string | number;
  deteccoes: DeteccaoLaudo[];
  observacoes_gerais?: string;
  deteccoes_invalidas?: number;
};

export class AnalysisJobNotFoundError extends Error {
  constructor(message = "Análise não encontrada ou expirada.") {
    super(message);
    this.name = "AnalysisJobNotFoundError";
  }
}

export type TriggerAnalysisResponse = {
  job_id: string;
};

export type PollAnalysisStatusResponse = {
  status: AnalysisJobStatus;
  result: Laudo | null;
};

const INSPECOES_API_BASE = "/api/v1/inspecoes";

const LEGACY_DEFEITO_ALIASES: Record<string, DefeitoDNIT> = {
  Panelas: "Panelas (buracos)",
};

function normalizeDefeitoLabel(value: unknown): DefeitoDNIT | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (DEFEITOS_DNIT.includes(trimmed as DefeitoDNIT)) {
    return trimmed as DefeitoDNIT;
  }

  return LEGACY_DEFEITO_ALIASES[trimmed] ?? null;
}

function isDefeitoDNIT(value: unknown): value is DefeitoDNIT {
  return normalizeDefeitoLabel(value) !== null;
}

function isAnalysisJobStatus(value: unknown): value is AnalysisJobStatus {
  return value === "pending" || value === "completed" || value === "failed";
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const normalized = value > 1 ? value / 100 : value;
  if (normalized > 1) {
    return null;
  }

  return normalized;
}

function normalizeDeteccao(raw: unknown): DeteccaoLaudo | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const defeito = normalizeDefeitoLabel(record.defeito);
  const confidenceScore = normalizeConfidence(record.confidence_score);

  if (!defeito || confidenceScore === null) {
    return null;
  }

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    defeito,
    confidence_score: confidenceScore,
    severidade: typeof record.severidade === "string" ? record.severidade : undefined,
    observacao: typeof record.observacao === "string" ? record.observacao : undefined,
    imagem_id:
      typeof record.imagem_id === "number" && Number.isFinite(record.imagem_id) ? record.imagem_id : null,
    revisado_manualmente: record.revisado_manualmente === true,
  };
}

function normalizeLaudo(raw: unknown): Laudo | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const rawDeteccoes = Array.isArray(record.deteccoes) ? record.deteccoes : [];
  const deteccoes = rawDeteccoes
    .map(normalizeDeteccao)
    .filter((item): item is DeteccaoLaudo => item !== null);
  const deteccoesInvalidas = rawDeteccoes.length - deteccoes.length;

  const inspecaoId =
    typeof record.inspecao_id === "string" || typeof record.inspecao_id === "number" ? record.inspecao_id : undefined;

  return {
    inspecao_id: inspecaoId,
    deteccoes,
    observacoes_gerais: typeof record.observacoes_gerais === "string" ? record.observacoes_gerais : undefined,
    deteccoes_invalidas: deteccoesInvalidas > 0 ? deteccoesInvalidas : undefined,
  };
}

export async function triggerAnalysis(inspecaoId: string | number): Promise<TriggerAnalysisResponse> {
  try {
    const response = await authApi.post(`${INSPECOES_API_BASE}/${inspecaoId}/analisar`);
    const jobId = response.data?.job_id;

    if (typeof jobId !== "string" || jobId.trim() === "") {
      throw new Error("Resposta inválida ao iniciar análise de IA.");
    }

    return { job_id: jobId };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Não foi possível iniciar a análise de IA.";
      throw new Error(message);
    }

    throw error;
  }
}

export async function pollAnalysisStatus(jobId: string): Promise<PollAnalysisStatusResponse> {
  try {
    const response = await authApi.get(`${INSPECOES_API_BASE}/analise/${jobId}/status`);
    const status = response.data?.status;
    const result = response.data?.result;

    if (!isAnalysisJobStatus(status)) {
      throw new Error("Resposta inválida ao consultar status da análise.");
    }

    const normalizedResult = result === null || result === undefined ? null : normalizeLaudo(result);

    if (status === "completed" && !normalizedResult) {
      throw new Error("Análise concluída sem laudo retornado.");
    }

    return {
      status,
      result: normalizedResult,
    };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AnalysisJobNotFoundError();
    }

    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Não foi possível consultar o status da análise.";
      throw new Error(message);
    }

    throw error;
  }
}

export async function saveReview(inspecaoId: string | number, data: Laudo): Promise<Laudo> {
  try {
    const response = await authApi.put(`${INSPECOES_API_BASE}/${inspecaoId}/laudo`, data);
    const normalized = normalizeLaudo(response.data);

    if (!normalized) {
      throw new Error("Resposta inválida ao salvar laudo.");
    }

    return normalized;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      let message = "Não foi possível salvar o laudo revisado.";

      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      } else if (Array.isArray(detail)) {
        const parts = detail
          .map((item) => {
            if (typeof item === "object" && item !== null && "msg" in item) {
              const loc = Array.isArray((item as { loc?: unknown }).loc)
                ? (item as { loc: unknown[] }).loc.join(".")
                : "";
              const msg = String((item as { msg?: unknown }).msg ?? "");
              return loc ? `${loc}: ${msg}` : msg;
            }
            return null;
          })
          .filter((part): part is string => Boolean(part));
        if (parts.length > 0) {
          message = parts.join(" ");
        }
      }

      throw new Error(message);
    }

    throw error;
  }
}
