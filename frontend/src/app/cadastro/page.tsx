"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { User, Shield, MapPin, Mail, Lock, Route } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    setFormData((prev) => ({
      ...prev,
      [id]: value,
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
    
    if (!formData.nome.trim()) newFieldErrors.nome = "Insira seu nome completo.";
    if (!formData.crea.trim()) newFieldErrors.crea = "Insira um registro CREA válido.";
    if (!formData.cidade.trim()) newFieldErrors.cidade = "Insira a cidade.";
    if (!formData.uf.trim()) newFieldErrors.uf = "Selecione uma UF.";
    if (!formData.email.trim()) newFieldErrors.email = "Insira um e-mail válido.";
    if (!formData.senha.trim()) newFieldErrors.senha = "Insira uma senha.";
    if (!formData.confirmarSenha.trim()) newFieldErrors.confirmarSenha = "Confirme sua senha.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return; 
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError("As senhas digitadas não são iguais.");
      return;
    }

    setLoading(true);

    try {
      const API_URL = `${window.location.hostname === "localhost" ? "http://localhost:8000" : window.location.origin}/api/supervisores`;

      const supervisorData = {
        nome: formData.nome,
        identificador_profissional: formData.crea,
        cidade: formData.cidade,
        uf: formData.uf,
        email: formData.email,
        senha: formData.senha,
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