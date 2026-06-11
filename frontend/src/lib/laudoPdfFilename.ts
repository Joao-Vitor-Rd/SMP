function padData(valor: number): string {
  return String(valor).padStart(2, "0");
}

function formatarDataArquivo(date: Date): string {
  const ano = date.getUTCFullYear();
  const mes = padData(date.getUTCMonth() + 1);
  const dia = padData(date.getUTCDate());

  return `${ano}-${mes}-${dia}`;
}

export function buildLaudoPdfFilename(via: string, km: string, date: Date): string {
  return `Laudo_${via}_${km}_${formatarDataArquivo(date)}.pdf`;
}
