"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { MapContainerBaseInnerProps } from "./MapContainerBaseInner";

export type MapContainerBaseProps = MapContainerBaseInnerProps & {
  loading?: boolean;
  errorMessage?: string | null;
  loadingMessage?: string;
};

const MapContainerBaseInner = dynamic(() => import("./MapContainerBaseInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[600px] w-full items-center justify-center rounded-lg bg-slate-100 shadow-md"
      aria-busy="true"
      aria-label="Carregando mapa"
    >
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#0a5483]" />
        <p className="text-sm font-medium text-slate-600">Inicializando mapa...</p>
      </div>
    </div>
  ),
});

function MapLoadingState({ message }: { message: string }) {
  return (
    <div
      className="relative flex h-[600px] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50/80 shadow-md"
      aria-busy="true"
      aria-label="Carregando inspeções"
    >
      <div className="absolute inset-0 animate-pulse bg-linear-to-br from-slate-100 via-slate-200/60 to-slate-100" />
      <div className="relative flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-[#0a5483]" />
        {message}
      </div>
    </div>
  );
}

function MapErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-[600px] w-full items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50/80 px-6 text-center shadow-md">
      <div className="max-w-md">
        <p className="text-lg font-black text-rose-700">Falha ao carregar o mapa</p>
        <p className="mt-2 text-sm leading-6 text-rose-700/80">{message}</p>
      </div>
    </div>
  );
}

export default function MapContainerBase({
  loading = false,
  errorMessage = null,
  loadingMessage = "Carregando imagens processadas...",
  ...mapProps
}: MapContainerBaseProps) {
  if (loading) {
    return <MapLoadingState message={loadingMessage} />;
  }

  if (errorMessage) {
    return <MapErrorState message={errorMessage} />;
  }

  return <MapContainerBaseInner {...mapProps} />;
}
