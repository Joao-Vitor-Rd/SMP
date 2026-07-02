"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";

import LaudoPDFTemplate from "./LaudoPDFTemplate";

type LaudoPdfExportLinkProps = {
  via: string;
  km: string;
  pci: number;
  igg: number;
  dataInspecao: Date;
  fileName: string;
};

export default function LaudoPdfExportLink({
  via,
  km,
  pci,
  igg,
  dataInspecao,
  fileName,
}: LaudoPdfExportLinkProps) {
  return (
    <PDFDownloadLink
      document={
        <LaudoPDFTemplate
          via={via}
          km={km}
          pci={pci}
          igg={igg}
          dataInspecao={dataInspecao}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <span
          role="button"
          className={`inline-flex items-center rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-wide ${
            loading
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
          }`}
        >
          {loading ? "Gerando PDF..." : "Exportar PDF"}
        </span>
      )}
    </PDFDownloadLink>
  );
}
