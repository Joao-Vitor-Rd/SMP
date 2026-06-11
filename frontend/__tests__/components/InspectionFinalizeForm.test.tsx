import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InspectionFinalizeForm from "../../components/InspectionFinalizeForm";
import { publishLaudo } from "../../src/lib/laudoPublicationApi";
import {
  indicesExemplo,
  kmExemplo,
  laudoPublicadoExemplo,
  resumoExemplo,
  viaExemplo,
} from "../fixtures/finalizeInspectionFixtures";

jest.mock(
  "../../src/lib/laudoPublicationApi",
  () => ({
    publishLaudo: jest.fn(),
  }),
  { virtual: true }
);

const publishLaudoSpy = publishLaudo as jest.MockedFunction<typeof publishLaudo>;

function criarPromisePendente<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("InspectionFinalizeForm — Finalizar Inspeção (US-15)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("não renderiza o botão 'Exportar PDF' antes do retorno HTTP 201 da publicação", () => {
    render(<InspectionFinalizeForm inspecaoId="inspecao-99" initialResumo={resumoExemplo} />);

    expect(screen.queryByRole("button", { name: /exportar pdf/i })).not.toBeInTheDocument();
  });

  it("envia POST para /api/laudos/ com os dados do formulário envelopados em resumo", async () => {
    const user = userEvent.setup();
    publishLaudoSpy.mockResolvedValue(laudoPublicadoExemplo);

    render(<InspectionFinalizeForm inspecaoId="inspecao-99" />);

    await user.type(screen.getByLabelText(/via/i), viaExemplo);
    await user.type(screen.getByLabelText(/^km$/i), kmExemplo);
    await user.type(screen.getByLabelText(/pci/i), String(indicesExemplo.pci));
    await user.type(screen.getByLabelText(/igg/i), String(indicesExemplo.igg));
    await user.type(screen.getByLabelText(/observações/i), resumoExemplo.observacoes ?? "");

    await user.click(screen.getByRole("button", { name: /publicar laudo/i }));

    await waitFor(() => {
      expect(publishLaudoSpy).toHaveBeenCalledTimes(1);
    });

    expect(publishLaudoSpy).toHaveBeenCalledWith("inspecao-99", {
      resumo: {
        via: viaExemplo,
        km: kmExemplo,
        pci: indicesExemplo.pci,
        igg: indicesExemplo.igg,
        observacoes: resumoExemplo.observacoes,
      },
    });
  });

  it("mantém 'Exportar PDF' oculto enquanto a publicação está pendente", async () => {
    const user = userEvent.setup();
    const pendente = criarPromisePendente(laudoPublicadoExemplo);
    publishLaudoSpy.mockReturnValue(pendente.promise);

    render(<InspectionFinalizeForm inspecaoId="inspecao-99" initialResumo={resumoExemplo} />);

    await user.click(screen.getByRole("button", { name: /publicar laudo/i }));

    expect(screen.queryByRole("button", { name: /exportar pdf/i })).not.toBeInTheDocument();

    pendente.resolve(laudoPublicadoExemplo);

    expect(await screen.findByRole("button", { name: /exportar pdf/i })).toBeInTheDocument();
  });

  it("renderiza 'Exportar PDF' somente após HTTP 201 da publicação", async () => {
    const user = userEvent.setup();
    publishLaudoSpy.mockResolvedValue(laudoPublicadoExemplo);

    render(<InspectionFinalizeForm inspecaoId="inspecao-99" initialResumo={resumoExemplo} />);

    expect(screen.queryByRole("button", { name: /exportar pdf/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /publicar laudo/i }));

    expect(await screen.findByRole("button", { name: /exportar pdf/i })).toBeInTheDocument();
  });
});
