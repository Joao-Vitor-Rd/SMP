export const FORM_FIELD_LIMITS = {
  fullName: 150,
  city: 50,
  email: 150,
  password: 72,
  crea: 9,
  organization: 255,
  cpfCftDigits: 11,
  cpfCftFormatted: 14,
} as const;

export const CREA_FORMAT_REGEX = /^[A-Z]{2}-\d{6}$/;
export const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LETTERS_SPACES_HYPHEN_REGEX = /^[A-Za-zÀ-ÿ\s-]+$/;
export const ORGANIZATION_TEXT_REGEX = /^[A-Za-zÀ-ÿ\s/&.\-]+$/;
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function limitarTexto(valor: string, limite: number) {
  return valor.slice(0, limite);
}

export function normalizarEspacos(valor: string) {
  return valor.trim().replace(/\s+/g, " ");
}

export function sanitizarTextoSomenteLetras(valor: string, limite: number) {
  return limitarTexto(valor.replace(/[^A-Za-zÀ-ÿ\s-]/g, ""), limite);
}

export function sanitizarTextoOrganizacao(valor: string) {
  return limitarTexto(
    valor.replace(/[^A-Za-zÀ-ÿ\s/&.\-]/g, ""),
    FORM_FIELD_LIMITS.organization,
  );
}

export function sanitizarEmail(valor: string) {
  return limitarTexto(valor.replace(/\s/g, "").toLowerCase(), FORM_FIELD_LIMITS.email);
}

export function limitarSenha(valor: string) {
  return limitarTexto(valor, FORM_FIELD_LIMITS.password);
}

export function formatarCrea(valor: string) {
  const caracteres = valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let uf = "";
  let numeros = "";

  for (const caractere of caracteres) {
    if (uf.length < 2 && /[A-Z]/.test(caractere)) {
      uf += caractere;
      continue;
    }

    if (uf.length === 2 && numeros.length < 6 && /\d/.test(caractere)) {
      numeros += caractere;
    }
  }

  return numeros ? `${uf}-${numeros}` : uf;
}
