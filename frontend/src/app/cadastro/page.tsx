"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { User, Shield, MapPin, Mail, Lock, Route } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CREA_FORMAT_REGEX,
  EMAIL_FORMAT_REGEX,
  FORM_FIELD_LIMITS,
  LETTERS_SPACES_HYPHEN_REGEX,
  STRONG_PASSWORD_REGEX,
  formatarCrea,
  limitarSenha,
  normalizarEspacos,
  sanitizarEmail,
  sanitizarTextoSomenteLetras,
} from "../../lib/formFieldValidation";

const UF_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

function formatarCampoCadastro(id: string, value: string) {
  if (id === "nome") {
    return sanitizarTextoSomenteLetras(value, FORM_FIELD_LIMITS.fullName);
  }

  if (id === "crea") {
    return formatarCrea(value);
  }

  if (id === "cidade") {
    return sanitizarTextoSomenteLetras(value, FORM_FIELD_LIMITS.city);
  }

  if (id === "email") {
    return sanitizarEmail(value);
  }

  if (id === "senha" || id === "confirmarSenha") {
    return limitarSenha(value);
  }

  return value;
}

export default function CadastroPage() {
  const router = useRouter(); 
  const [formData, setFormData] = useState({
    nome: "",
    crea: "",
    cidade: "",
    uf: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target;
    const valorFormatado = formatarCampoCadastro(id, value);

    setFormData((prev) => ({
      ...prev,
      [id]: valorFormatado,
    }));
    
    // Limpa a mensagem de erro inline do campo quando o usuário voltar a digitar
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});

    // Validação inline local fail-fast para múltiplos campos
    const newFieldErrors: Record<string, string> = {};
    
    const nome = normalizarEspacos(formData.nome);
    const crea = formData.crea.trim().toUpperCase();
    const cidade = normalizarEspacos(formData.cidade);
    const email = sanitizarEmail(formData.email);
    const senha = formData.senha;
    const confirmarSenha = formData.confirmarSenha;

    if (!nome) {
      newFieldErrors.nome = "Insira seu nome completo.";
    } else if (nome.length < 3) {
      newFieldErrors.nome = "Nome completo deve ter pelo menos 3 caracteres.";
    } else if (!LETTERS_SPACES_HYPHEN_REGEX.test(nome)) {
      newFieldErrors.nome = "Nome deve incluir apenas letras.";
    }

    if (!crea) {
      newFieldErrors.crea = "Insira um registro CREA válido.";
    } else if (!CREA_FORMAT_REGEX.test(crea)) {
      newFieldErrors.crea = "CREA deve estar no formato UF-000000.";
    }

    if (!cidade) {
      newFieldErrors.cidade = "Insira a cidade.";
    } else if (cidade.length < 2) {
      newFieldErrors.cidade = "Cidade deve ter pelo menos 2 caracteres.";
    } else if (!LETTERS_SPACES_HYPHEN_REGEX.test(cidade)) {
      newFieldErrors.cidade = "Cidade deve incluir apenas letras.";
    }

    if (!formData.uf.trim()) newFieldErrors.uf = "Selecione uma UF.";

    if (!email) {
      newFieldErrors.email = "Insira um e-mail válido.";
    } else if (!EMAIL_FORMAT_REGEX.test(email)) {
      newFieldErrors.email = "Insira um e-mail válido.";
    }

    if (!senha) {
      newFieldErrors.senha = "Insira uma senha.";
    } else if (senha.length < 8) {
      newFieldErrors.senha = "Senha deve conter 8 caracteres.";
    } else if (!STRONG_PASSWORD_REGEX.test(senha)) {
      newFieldErrors.senha = "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número.";
    }

    if (!confirmarSenha) {
      newFieldErrors.confirmarSenha = "Confirme sua senha.";
    } else if (senha !== confirmarSenha) {
      newFieldErrors.confirmarSenha = "As senhas digitadas não são iguais.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return; 
    }

    setLoading(true);

    try {
      const API_URL = `${window.location.hostname === "localhost" ? "http://localhost:8000" : window.location.origin}/api/supervisores`;

      const supervisorData = {
        nome,
        identificador_profissional: crea,
        cidade,
        uf: formData.uf,
        email,
        senha,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supervisorData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Erro ao comunicar com o servidor.",
        );
      }

      setSuccess(true);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-950 text-white p-2.5 rounded-lg flex items-center justify-center">
            <Route size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-950">RoadSense AI</h1>
            <p className="text-xs text-gray-600">
              Análise inteligente de pavimentos
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-gray-900">Criar conta</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✓ Conta criada com sucesso! Redirecionando...
          </div>
        )}

        {/* Adicionado o noValidate aqui para desativar a validação do HTML5 */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <div className={`flex items-center bg-white border ${fieldErrors.nome ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 h-12`}>
              <User size={20} className={`${fieldErrors.nome ? 'text-red-400' : 'text-gray-400'} flex-shrink-0`} />
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Nome Completo"
                maxLength={FORM_FIELD_LIMITS.fullName}
                required
                disabled={loading}
                className="w-full border-none outline-none bg-transparent ml-3 text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-100"
              />
            </div>
            {fieldErrors.nome && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.nome}</p>}
          </div>

          <div>
            <div className={`flex items-center bg-white border ${fieldErrors.crea ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 h-12`}>
              <Shield size={20} className={`${fieldErrors.crea ? 'text-red-400' : 'text-gray-400'} flex-shrink-0`} />
              <input
                type="text"
                id="crea"
                value={formData.crea}
                onChange={handleChange}
                placeholder="Registro CREA (Ex: SP-123456)"
                maxLength={FORM_FIELD_LIMITS.crea}
                required
                disabled={loading}
                className="w-full border-none outline-none bg-transparent ml-3 text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-100"
              />
            </div>
            {fieldErrors.crea && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.crea}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <div className={`flex items-center bg-white border ${fieldErrors.cidade ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 h-12`}>
                <MapPin size={20} className={`${fieldErrors.cidade ? 'text-red-400' : 'text-gray-400'} flex-shrink-0`} />
                <input
                  type="text"
                  id="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Cidade"
                  maxLength={FORM_FIELD_LIMITS.city}
                  required
                  disabled={loading}
                  className="w-full border-none outline-none bg-transparent ml-3 text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-100"
                />
              </div>
              {fieldErrors.cidade && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.cidade}</p>}
            </div>

            <div>
              <select
                id="uf"
                value={formData.uf}
                onChange={handleChange}
                required
                disabled={loading}
                className={`w-20 bg-white border ${fieldErrors.uf ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 h-12 text-sm text-gray-700 outline-none disabled:bg-gray-100`}
              >
                <option value="">UF</option>
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              {fieldErrors.uf && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.uf}</p>}
            </div>
          </div>

          <div>
            <div className={`flex items-center bg-white border ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 h-12`}>
              <Mail size={20} className={`${fieldErrors.email ? 'text-red-400' : 'text-gray-400'} flex-shrink-0`} />
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="E-mail"
                maxLength={FORM_FIELD_LIMITS.email}
                autoComplete="email"
                required
                disabled={loading}
                className="w-full border-none outline-none bg-transparent ml-3 text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-100"
              />
            </div>
            {fieldErrors.email && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.email}</p>}
          </div>

          <div>
            <div className={`flex items-center bg-white border ${fieldErrors.senha ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 h-12`}>
              <Lock size={20} className={`${fieldErrors.senha ? 'text-red-400' : 'text-gray-400'} flex-shrink-0`} />
              <input
                type="password"
                id="senha"
                value={formData.senha}
                onChange={handleChange}
                placeholder="Senha"
                maxLength={FORM_FIELD_LIMITS.password}
                minLength={8}
                required
                disabled={loading}
                className="w-full border-none outline-none bg-transparent ml-3 text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-100"
              />
            </div>
            {fieldErrors.senha && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.senha}</p>}
          </div>

          <div>
            <div className={`flex items-center bg-white border ${fieldErrors.confirmarSenha ? 'border-red-400' : 'border-gray-300'} rounded-lg px-4 h-12`}>
              <Lock size={20} className={`${fieldErrors.confirmarSenha ? 'text-red-400' : 'text-gray-400'} flex-shrink-0`} />
              <input
                type="password"
                id="confirmarSenha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                placeholder="Confirmar Senha"
                maxLength={FORM_FIELD_LIMITS.password}
                minLength={8}
                required
                disabled={loading}
                className="w-full border-none outline-none bg-transparent ml-3 text-sm text-gray-700 placeholder-gray-400 disabled:bg-gray-100"
              />
            </div>
            {fieldErrors.confirmarSenha && <p className="text-[#e74c3c] text-sm mt-1">{fieldErrors.confirmarSenha}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg mt-6 transition-colors"
          >
            {loading ? "Processando..." : "Concluir Cadastro"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-blue-900 font-bold hover:underline"
          >
            Acesse aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
