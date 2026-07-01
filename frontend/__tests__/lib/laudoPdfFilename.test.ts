import { buildLaudoPdfFilename } from "../../src/lib/laudoPdfFilename";
import { kmExemplo, viaExemplo } from "../fixtures/finalizeInspectionFixtures";

const MASCARA_NOME_LAUDO = /^Laudo_[^_]+_[^_]+_\d{4}-\d{2}-\d{2}\.pdf$/;

describe("buildLaudoPdfFilename (US-15)", () => {
  it("gera nome no formato Laudo_[Via]_[Km]_[AAAA-MM-DD].pdf", () => {
    const nomeArquivo = buildLaudoPdfFilename(viaExemplo, kmExemplo, new Date("2026-06-10T15:30:00.000Z"));

    expect(nomeArquivo).toMatch(MASCARA_NOME_LAUDO);
    expect(nomeArquivo).toBe("Laudo_BR-040_12+500_2026-06-10.pdf");
  });

  it("preenche mês e dia com zero à esquerda", () => {
    const nomeArquivo = buildLaudoPdfFilename("SP-330", "5+200", new Date("2026-03-05T12:00:00.000Z"));

    expect(nomeArquivo).toMatch(MASCARA_NOME_LAUDO);
    expect(nomeArquivo).toBe("Laudo_SP-330_5+200_2026-03-05.pdf");
  });

  it("rejeita saídas fora da máscara genérica", () => {
    const exemplosInvalidos = [
      "laudo_BR-040_12+500_2026-06-10.pdf",
      "Laudo_BR-040_12+500_10-06-2026.pdf",
      "Laudo_BR-040_12+500_2026-6-10.pdf",
      "Laudo_BR-040_12+500_2026-06-10",
      "Laudo_BR-040_12+500_2026-06-10.PDF",
    ];

    exemplosInvalidos.forEach((exemplo) => {
      expect(exemplo).not.toMatch(MASCARA_NOME_LAUDO);
    });
  });
});
