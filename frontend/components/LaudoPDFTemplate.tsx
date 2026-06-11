import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import {
  DEFAULT_RESPONSAVEL_TECNICO,
  DEFEITOS_DNIT_LAUDO,
  LAUDO_NORMAS_TECNICAS,
  LAUDO_SUBTITULO,
  LAUDO_TITULO,
  LAUDO_VALIDADE_TEXTO,
  type DefeitoDNITLaudo,
} from "../src/lib/laudoPdfConstants";

export type LaudoPDFTemplateProps = {
  via: string;
  km: string;
  pci: number;
  igg: number;
  dataInspecao: Date;
  responsavelNome?: string;
  responsavelCrea?: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#0a5483",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0a5483",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#4b5563",
  },
  section: {
    marginBottom: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0a5483",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  sectionTitleSpaced: {
    marginTop: 14,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 130,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  value: {
    flex: 1,
    color: "#111827",
  },
  indicesRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  indexCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
  },
  indexLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  indexValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0a5483",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  colCodigo: { width: "18%" },
  colDescricao: { width: "32%" },
  colSeveridade: { width: "22%" },
  colExtensao: { width: "28%" },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
  },
  tableCellText: {
    fontSize: 9,
    color: "#111827",
  },
  normsText: {
    fontSize: 9,
    color: "#374151",
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },
  footerText: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
});

function formatarData(date: Date): string {
  const dia = String(date.getUTCDate()).padStart(2, "0");
  const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
  const ano = date.getUTCFullYear();

  return `${dia}/${mes}/${ano}`;
}

function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{rotulo}</Text>
      <Text style={styles.value}>{valor}</Text>
    </View>
  );
}

function CardIndice({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.indexCard}>
      <Text style={styles.indexLabel}>{rotulo}</Text>
      <Text style={styles.indexValue}>{valor}</Text>
    </View>
  );
}

function TabelaDefeitos({ defeitos }: { defeitos: readonly DefeitoDNITLaudo[] }) {
  return (
    <>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colCodigo]}>Código</Text>
        <Text style={[styles.tableHeaderText, styles.colDescricao]}>Descrição</Text>
        <Text style={[styles.tableHeaderText, styles.colSeveridade]}>Severidade</Text>
        <Text style={[styles.tableHeaderText, styles.colExtensao]}>Extensão</Text>
      </View>
      {defeitos.map((defeito) => (
        <View key={defeito.codigo} style={styles.tableRow}>
          <Text style={[styles.tableCellText, styles.colCodigo]}>{defeito.codigo}</Text>
          <Text style={[styles.tableCellText, styles.colDescricao]}>{defeito.descricao}</Text>
          <Text style={[styles.tableCellText, styles.colSeveridade]}>{defeito.severidade}</Text>
          <Text style={[styles.tableCellText, styles.colExtensao]}>{defeito.extensao}</Text>
        </View>
      ))}
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{titulo}</Text>
      {children}
    </View>
  );
}

export default function LaudoPDFTemplate({
  via,
  km,
  pci,
  igg,
  dataInspecao,
  responsavelNome = DEFAULT_RESPONSAVEL_TECNICO.nome,
  responsavelCrea = DEFAULT_RESPONSAVEL_TECNICO.crea,
}: LaudoPDFTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{LAUDO_TITULO}</Text>
          <Text style={styles.subtitle}>{LAUDO_SUBTITULO}</Text>
        </View>

        <Secao titulo="Responsável Técnico">
          <LinhaDado rotulo="Nome:" valor={responsavelNome} />
          <LinhaDado rotulo="Registro CREA:" valor={responsavelCrea} />
        </Secao>

        <Secao titulo="Localização">
          <LinhaDado rotulo="Via:" valor={via} />
          <LinhaDado rotulo="Quilometragem:" valor={km} />
          <LinhaDado rotulo="Data da inspeção:" valor={formatarData(dataInspecao)} />
        </Secao>

        <Secao titulo="Avaliação Técnica">
          <View style={styles.indicesRow}>
            <CardIndice rotulo="PCI" valor={pci.toFixed(1)} />
            <CardIndice rotulo="IGG" valor={igg.toFixed(1)} />
          </View>

          <Text style={styles.sectionTitle}>Defeitos Identificados (DNIT)</Text>
          <TabelaDefeitos defeitos={DEFEITOS_DNIT_LAUDO} />

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Normas Técnicas Aplicadas</Text>
          <Text style={styles.normsText}>{LAUDO_NORMAS_TECNICAS}</Text>
        </Secao>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{LAUDO_VALIDADE_TEXTO}</Text>
        </View>
      </Page>
    </Document>
  );
}
