export type DefeitoDNITLaudo = {
  codigo: string;
  descricao: string;
  severidade: string;
  extensao: string;
};

export type ResponsavelTecnico = {
  nome: string;
  crea: string;
};

export const LAUDO_TITULO = "Laudo de Inspeção de Pavimento";
export const LAUDO_SUBTITULO = "Sistema de Monitoramento de Pavimentos — SMP";

export const DEFEITOS_DNIT_LAUDO: readonly DefeitoDNITLaudo[] = [
  {
    codigo: "DNIT-01",
    descricao: "Panelas",
    severidade: "Moderada",
    extensao: "12,5 m²",
  },
  {
    codigo: "DNIT-02",
    descricao: "Trincas interligadas",
    severidade: "Grave",
    extensao: "8,0 m",
  },
  {
    codigo: "DNIT-03",
    descricao: "Desgaste superficial",
    severidade: "Leve",
    extensao: "45,0 m²",
  },
];

export const DEFAULT_RESPONSAVEL_TECNICO: ResponsavelTecnico = {
  nome: "Eng. Ana Paula Ribeiro",
  crea: "CREA-MG 123456/D",
};

export const LAUDO_NORMAS_TECNICAS =
  "Normas técnicas aplicadas: DNIT 005/2003-TER (Manual de Avaliação de Defeitos em Pavimentos Flexíveis), " +
  "DNIT 031/2006-ES (Avaliação da Condição de Rodovias Paveadas) e diretrizes vigentes do DNIT para inspeção " +
  "e classificação de defeitos em pavimentos flexíveis.";

export const LAUDO_VALIDADE_TEXTO =
  "Este laudo possui validade técnica de 90 dias a partir da data de sua emissão.";
