"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

import {
  DEFEITOS_DNIT,
  saveReview,
  type DefeitoDNIT,
  type DeteccaoLaudo,
  type Laudo,
} from "../src/lib/inspectionAnalysisApi";

const LOW_CONFIDENCE_THRESHOLD = 0.85;

interface InspectionReviewFormProps {
  laudo: Laudo;
  inspecaoId: string | number;
  onReviewSaved?: (laudo: Laudo) => void;
}

function formatConfidence(score: number) {
  return `${Math.round(score * 100)}%`;
}

export default function InspectionReviewForm({ laudo, inspecaoId, onReviewSaved }: InspectionReviewFormProps) {
  const [formLaudo, setFormLaudo] = useState<Laudo>(laudo);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateDeteccao = (index: number, patch: Partial<DeteccaoLaudo>) => {
    setFormLaudo((current) => ({
      ...current,
      deteccoes: current.deteccoes.map((deteccao, deteccaoIndex) =>
        deteccaoIndex === index ? { ...deteccao, ...patch, revisado_manualmente: true } : deteccao
      ),
    }));
  };

  const handleSaveReview = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const savedLaudo = await saveReview(inspecaoId, formLaudo);
      onReviewSaved?.(savedLaudo);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erro ao salvar laudo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deteccoesInvalidas = formLaudo.deteccoes_invalidas ?? 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSaveReview();
      }}
    >
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Revisão do Laudo de Inspeção</h2>
        <p className="mt-1 text-sm text-gray-500">
          Revise as detecções da IA e ajuste classificações conforme DNIT 005/2003-TER. Ao salvar, a finalização da
          inspeção será liberada.
        </p>
      </div>

      {deteccoesInvalidas > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <Info className="mt-0.5 shrink-0 text-sky-600" size={18} aria-hidden />
          <p className="text-sm text-sky-900">
            {deteccoesInvalidas === 1
              ? "1 detecção retornada pela IA não pôde ser interpretada (fora da taxonomia DNIT ou sem score válido) e não está listada abaixo."
              : `${deteccoesInvalidas} detecções retornadas pela IA não puderam ser interpretadas (fora da taxonomia DNIT ou sem score válido) e não estão listadas abaixo.`}
          </p>
        </div>
      )}

      {formLaudo.deteccoes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Nenhuma detecção registrada no laudo.
        </div>
      ) : (
        <div className="space-y-4">
          {formLaudo.deteccoes.map((deteccao, index) => {
            const lowConfidence = deteccao.confidence_score < LOW_CONFIDENCE_THRESHOLD;

            return (
              <div
                key={deteccao.id ?? `deteccao-${index}`}
                className={`rounded-2xl border p-5 transition-all ${
                  lowConfidence ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50/30"
                }`}
              >
                {lowConfidence && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400 bg-amber-100/80 px-4 py-3">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={18} aria-hidden />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Revisão manual recomendada</p>
                      <p className="mt-0.5 text-xs text-amber-800">
                        Confiança abaixo de 85% ({formatConfidence(deteccao.confidence_score)}).
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`defeito-${index}`}
                      className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                      Defeito (DNIT)
                    </label>
                    <select
                      id={`defeito-${index}`}
                      value={deteccao.defeito}
                      onChange={(event) =>
                        updateDeteccao(index, { defeito: event.target.value as DefeitoDNIT })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30"
                    >
                      {DEFEITOS_DNIT.map((defeito) => (
                        <option key={defeito} value={defeito}>
                          {defeito}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`severidade-${index}`}
                      className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                      Severidade
                    </label>
                    <input
                      id={`severidade-${index}`}
                      type="text"
                      value={deteccao.severidade ?? ""}
                      onChange={(event) => updateDeteccao(index, { severidade: event.target.value })}
                      placeholder="Ex: Leve, Moderada, Grave"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor={`observacao-${index}`}
                      className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                      Observação
                    </label>
                    <textarea
                      id={`observacao-${index}`}
                      rows={3}
                      value={deteccao.observacao ?? ""}
                      onChange={(event) => updateDeteccao(index, { observacao: event.target.value })}
                      placeholder="Descreva ajustes ou contexto da detecção"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <span className="rounded-full bg-white px-3 py-1 text-gray-700 shadow-sm">
                    Confiança: {formatConfidence(deteccao.confidence_score)}
                  </span>
                  {deteccao.revisado_manualmente && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                      <CheckCircle2 size={14} aria-hidden />
                      Revisado manualmente
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label htmlFor="observacoes-gerais" className="mb-1 block text-sm font-bold text-gray-900">
          Observações gerais
        </label>
        <textarea
          id="observacoes-gerais"
          rows={4}
          value={formLaudo.observacoes_gerais ?? ""}
          onChange={(event) =>
            setFormLaudo((current) => ({
              ...current,
              observacoes_gerais: event.target.value,
            }))
          }
          placeholder="Comentários adicionais sobre a inspeção"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30"
        />
      </div>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex justify-end border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${
            isSubmitting
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : "bg-[#0a5483] text-white shadow-lg hover:bg-[#083d61]"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} aria-hidden />
              Salvando...
            </>
          ) : (
            "Salvar revisão do laudo"
          )}
        </button>
      </div>
    </form>
  );
}
