import type { FinalizarInspecaoResumo, LaudoPublicado } from "../../src/lib/laudoPublicationApi";

export const viaExemplo = "BR-040";
export const kmExemplo = "12+500";

export const indicesExemplo = {
  pci: 72.4,
  igg: 3.1,
} as const;

export const resumoExemplo: FinalizarInspecaoResumo = {
  via: viaExemplo,
  km: kmExemplo,
  pci: indicesExemplo.pci,
  igg: indicesExemplo.igg,
  observacoes: "Pavimento com trincas interligadas no acostamento direito.",
};

export const laudoPublicadoExemplo: LaudoPublicado = {
  id: "laudo-42",
  inspecao_id: "inspecao-99",
  publicado_em: "2026-06-10T23:00:00.000Z",
  resumo: resumoExemplo,
};
