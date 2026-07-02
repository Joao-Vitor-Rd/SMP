"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock, Sparkles } from "lucide-react";

import { SessionExpiredError } from "../src/lib/authApi";
import { ensureInspecaoId } from "../src/lib/laudoApi";
import { triggerAnalysis } from "../src/lib/inspectionAnalysisApi";
import type { FinalizarInspecaoResumo } from "../src/lib/laudoPublicationApi";
import { useInspectionAnalysis } from "./InspectionAnalysisProvider";
import InspectionFinalizeForm from "./InspectionFinalizeForm";
import InspectionProcessingQueue from "./InspectionProcessingQueue";
import InspectionReviewForm from "./InspectionReviewForm";

interface InspectionAnalysisPanelProps {
  inspecaoId?: string | number | null;
  canAnalyze: boolean;
  disabledReason?: string;
  initialResumo?: FinalizarInspecaoResumo;
}

export default function InspectionAnalysisPanel({
  inspecaoId,
  canAnalyze,
  disabledReason,
  initialResumo,
}: InspectionAnalysisPanelProps) {
  const { trackJob, getJob } = useInspectionAnalysis();
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);

  const [resolvedInspecaoId, setResolvedInspecaoId] = useState<string | number | null>(
    inspecaoId ?? null
  );

  const job = getJob(resolvedInspecaoId ?? "");
  const status = job?.status;
  const completedLaudo = job?.laudo ?? null;
  const isProcessing = isTriggering || status === "pending";
  const canShowReview = status === "completed" && completedLaudo !== null && resolvedInspecaoId != null;

  const handleTrigger = async () => {
    setIsTriggering(true);
    setTriggerError(null);
    setReviewSaved(false);

    try {
      const targetInspecaoId =
        resolvedInspecaoId ??
        inspecaoId ??
        (await ensureInspecaoId());

      setResolvedInspecaoId(targetInspecaoId);

      const { job_id } = await triggerAnalysis(targetInspecaoId);
      trackJob(targetInspecaoId, job_id);
    } catch (error) {
      const message =
        error instanceof SessionExpiredError
          ? "Sua sessão expirou. Faça login novamente para acionar a análise."
          : error instanceof Error
            ? error.message
            : "Não foi possível iniciar a análise de IA.";
      setTriggerError(message);
    } finally {
      setIsTriggering(false);
    }
  };

  // Estado terminal de sucesso: revisão do laudo e, após salvar, finalização.
  if (canShowReview && completedLaudo) {
    return (
      <div className="space-y-6">
        <ReviewedSummary reviewSaved={reviewSaved} />

        {!reviewSaved ? (
          <InspectionReviewForm
            laudo={completedLaudo}
            inspecaoId={resolvedInspecaoId}
            onReviewSaved={() => setReviewSaved(true)}
          />
        ) : (
          <InspectionFinalizeForm inspecaoId={resolvedInspecaoId} initialResumo={initialResumo} />
        )}
      </div>
    );
  }

  // Processando ou falha.
  if (status === "pending" || status === "failed") {
    return (
      <div className="space-y-4">
        <InspectionProcessingQueue status={status} jobId={job?.jobId} errorMessage={job?.error} />

        {status === "failed" && (
          <button
            type="button"
            onClick={handleTrigger}
            disabled={!canAnalyze || isProcessing}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all ${
              !canAnalyze || isProcessing
                ? "cursor-not-allowed bg-gray-200 text-gray-400"
                : "bg-[#0a5483] text-white shadow-sm hover:bg-[#083d61]"
            }`}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />}
            Analisar novamente
          </button>
        )}
      </div>
    );
  }

  // Estado inicial.
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleTrigger}
        disabled={!canAnalyze || isProcessing}
        className={`inline-flex items-center gap-2 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${
          !canAnalyze || isProcessing
            ? "cursor-not-allowed bg-gray-200 text-gray-400"
            : "bg-[#0a5483] text-white shadow-lg hover:bg-[#083d61]"
        }`}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={18} aria-hidden />
        ) : !canAnalyze ? (
          <Lock size={18} aria-hidden />
        ) : (
          <Sparkles size={18} aria-hidden />
        )}
        Analisar com IA
      </button>

      {!canAnalyze && (
        <p className="text-xs font-medium text-gray-500">
          {disabledReason ?? "Conclua o upload das imagens e o preenchimento das coordenadas para liberar a análise."}
        </p>
      )}

      {triggerError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {triggerError}
        </div>
      )}
    </div>
  );
}

function ReviewedSummary({ reviewSaved }: { reviewSaved: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} aria-hidden />
      <div>
        <p className="text-sm font-bold text-emerald-900">Análise de IA concluída</p>
        <p className="mt-0.5 text-sm text-emerald-800">
          {reviewSaved
            ? "Revisão salva. Finalize a inspeção publicando o laudo abaixo."
            : "Revise o laudo gerado conforme DNIT 005/2003-TER antes de finalizar a inspeção."}
        </p>
      </div>
    </div>
  );
}
