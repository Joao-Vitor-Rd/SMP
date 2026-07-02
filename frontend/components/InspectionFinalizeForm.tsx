"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { buildLaudoPdfFilename } from "../src/lib/laudoPdfFilename";
import {
  publishLaudo,
  type FinalizarInspecaoResumo,
  type LaudoPublicado,
} from "../src/lib/laudoPublicationApi";

const LaudoPdfExportLink = dynamic(() => import("./LaudoPdfExportLink"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex items-center rounded-xl bg-gray-200 px-6 py-4 text-sm font-bold text-gray-500">
      Preparando PDF...
    </span>
  ),
});

type FormState = {
  via: string;
  km: string;
  pci: string;
  igg: string;
  observacoes: string;
};

interface InspectionFinalizeFormProps {
  inspecaoId: string | number;
  initialResumo?: FinalizarInspecaoResumo;
}

type FormFieldConfig = {
  id: keyof FormState;
  label: string;
  type: "text" | "number" | "textarea";
  step?: string;
  fullWidth?: boolean;
  required?: boolean;
};

const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a5483]/30";

const FORM_FIELDS: FormFieldConfig[] = [
  { id: "via", label: "Via", type: "text", required: true },
  { id: "km", label: "Km", type: "text", required: true },
  { id: "pci", label: "PCI", type: "number", step: "0.1", required: true },
  { id: "igg", label: "IGG", type: "number", step: "0.1", required: true },
  { id: "observacoes", label: "Observações", type: "textarea", fullWidth: true },
];

function estadoInicial(initialResumo?: FinalizarInspecaoResumo): FormState {
  return {
    via: initialResumo?.via ?? "",
    km: initialResumo?.km ?? "",
    pci: initialResumo?.pci !== undefined ? String(initialResumo.pci) : "",
    igg: initialResumo?.igg !== undefined ? String(initialResumo.igg) : "",
    observacoes: initialResumo?.observacoes ?? "",
  };
}

function validarFormulario(form: FormState): string | null {
  if (!form.via.trim()) {
    return "Informe a via antes de publicar o laudo.";
  }
  if (!form.km.trim()) {
    return "Informe o trecho (Km) antes de publicar o laudo.";
  }

  const pci = Number.parseFloat(form.pci);
  if (!Number.isFinite(pci)) {
    return "Informe um valor numérico válido para o PCI.";
  }

  const igg = Number.parseFloat(form.igg);
  if (!Number.isFinite(igg)) {
    return "Informe um valor numérico válido para o IGG.";
  }

  return null;
}

function toResumo(form: FormState): FinalizarInspecaoResumo {
  return {
    via: form.via.trim(),
    km: form.km.trim(),
    pci: Number.parseFloat(form.pci),
    igg: Number.parseFloat(form.igg),
    observacoes: form.observacoes.trim() || undefined,
  };
}

function atualizarCampo(form: FormState, campo: keyof FormState, valor: string): FormState {
  return { ...form, [campo]: valor };
}

interface FormFieldProps {
  config: FormFieldConfig;
  value: string;
  onChange: (field: keyof FormState, value: string) => void;
}

function FormField({ config, value, onChange }: FormFieldProps) {
  const wrapperClass = config.fullWidth ? "md:col-span-2" : undefined;

  return (
    <div className={wrapperClass}>
      <label htmlFor={config.id} className="mb-1 block text-sm font-bold text-gray-900">
        {config.label}
      </label>
      {config.type === "textarea" ? (
        <textarea
          id={config.id}
          rows={4}
          value={value}
          onChange={(event) => onChange(config.id, event.target.value)}
          className={FORM_INPUT_CLASS}
        />
      ) : (
        <input
          id={config.id}
          type={config.type}
          step={config.step}
          required={config.required}
          value={value}
          onChange={(event) => onChange(config.id, event.target.value)}
          className={FORM_INPUT_CLASS}
        />
      )}
    </div>
  );
}

export default function InspectionFinalizeForm({ inspecaoId, initialResumo }: InspectionFinalizeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => estadoInicial(initialResumo));
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedLaudo, setPublishedLaudo] = useState<LaudoPublicado | null>(null);

  const alterarCampo = (campo: keyof FormState, valor: string) => {
    setForm((atual) => atualizarCampo(atual, campo, valor));
    if (publishError) {
      setPublishError(null);
    }
  };

  const publicar = async () => {
    const validationError = validarFormulario(form);
    if (validationError) {
      setPublishError(validationError);
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const laudo = await publishLaudo(inspecaoId, { resumo: toResumo(form) });
      setPublishedLaudo(laudo);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Erro ao publicar laudo.");
    } finally {
      setIsPublishing(false);
    }
  };

  const pdfFilename = publishedLaudo
    ? buildLaudoPdfFilename(
        publishedLaudo.resumo.via,
        publishedLaudo.resumo.km,
        new Date(publishedLaudo.publicado_em)
      )
    : "";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void publicar();
      }}
    >
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Finalizar Inspeção</h2>
        <p className="mt-1 text-sm text-gray-500">
          Publique o laudo com os índices da via antes de exportar o documento em PDF.
        </p>
      </div>

      {publishedLaudo && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} aria-hidden />
            <div>
              <p className="text-sm font-bold text-emerald-900">Laudo publicado com sucesso</p>
              <p className="mt-0.5 text-sm text-emerald-800">
                A inspeção foi finalizada. Você pode exportar o PDF ou voltar à listagem de trabalhos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/meus-trabalhos")}
            className="shrink-0 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Ver Meus Trabalhos
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FORM_FIELDS.map((field) => (
          <FormField
            key={field.id}
            config={field}
            value={form[field.id]}
            onChange={alterarCampo}
          />
        ))}
      </div>

      {publishError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {publishError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isPublishing || publishedLaudo !== null}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${
            isPublishing || publishedLaudo !== null
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : "bg-[#0a5483] text-white shadow-lg hover:bg-[#083d61]"
          }`}
        >
          {isPublishing ? (
            <>
              <Loader2 className="animate-spin" size={18} aria-hidden />
              Publicando...
            </>
          ) : publishedLaudo ? (
            "Laudo publicado"
          ) : (
            "Publicar Laudo"
          )}
        </button>

        {publishedLaudo && (
          <LaudoPdfExportLink
            via={publishedLaudo.resumo.via}
            km={publishedLaudo.resumo.km}
            pci={publishedLaudo.resumo.pci}
            igg={publishedLaudo.resumo.igg}
            dataInspecao={new Date(publishedLaudo.publicado_em)}
            fileName={pdfFilename}
          />
        )}
      </div>
    </form>
  );
}
