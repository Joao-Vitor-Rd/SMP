"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import type { TrackedJobStatus } from "./InspectionAnalysisProvider";

interface InspectionProcessingQueueProps {
  status: TrackedJobStatus;
  jobId?: string;
  errorMessage?: string | null;
}

/**
 * Componente puramente apresentacional do estado de processamento da análise.
 * O polling e o ciclo de vida do job são responsabilidade do poller global
 * (InspectionAnalysisProvider); aqui apenas refletimos o status recebido, de
 * modo que o feedback sobreviva à navegação entre páginas.
 */
export default function InspectionProcessingQueue({
  status,
  jobId,
  errorMessage,
}: InspectionProcessingQueueProps) {
  if (status === "completed") {
    return null;
  }

  if (status === "failed") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={22} aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-red-900">Falha no processamento</h3>
            <p className="mt-1 text-sm text-red-700">{errorMessage ?? "A análise de IA não pôde ser concluída."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#0a5483]/20 bg-[#f4f8fb] p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <Loader2 className="animate-spin text-[#0a5483]" size={24} aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Análise de IA em processamento</h3>
          <p className="mt-1 text-sm text-gray-600">
            Aguardando classificação conforme taxonomia DNIT 005/2003-TER. Você pode navegar pelo sistema; avisaremos
            quando o laudo estiver pronto.
          </p>
          {jobId ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#0a5483]">Job: {jobId}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
