'use client';

import { useState, FormEvent } from 'react';
import { User, Shield, MapPin, Mail, Lock, Activity } from 'lucide-react';
import Link from 'next/link';

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function CadastroPage() {
  const [formData, setFormData] = useState({
    nome: '',
    crea: '',
    cidade: '',
    uf: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validar senhas
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas digitadas não são iguais.');
      return;
    }

    setLoading(true);

    try {
      const API_URL = `${window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin}/api/supervisores`;
      
      const supervisorData = {
        nome: formData.nome,
        identificador_profissional: formData.crea,
        cidade: formData.cidade,
        uf: formData.uf,
        email: formData.email,
        senha: formData.senha
      };

      console.log('📤 Enviando dados:', supervisorData);
      console.log('🔗 URL:', API_URL);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supervisorData)
      });

      console.log('📊 Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erro retornado:', errorData);
        throw new Error(errorData.detail || errorData.message || 'Erro ao comunicar com o servidor.');
      }

      const result = await response.json();
      console.log('✅ Sucesso:', result);
      setSuccess(true);
      setFormData({
        nome: '',
        crea: '',
        cidade: '',
        uf: '',
        email: '',
        senha: '',
        confirmarSenha: ''
      });
    } catch (err) {
      console.error('🔴 Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-950 text-white p-2.5 rounded-lg flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-950">RoadSense AI</h1>
            <p className="text-xs text-gray-600">Análise inteligente de pavimentos</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-gray-900">Criar conta</h2>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✓ Conta criada com sucesso!
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
            <User size={20} className="text-gray-400 flex-shrink-0" />
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

          {/* CREA */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
            <Shield size={20} className="text-gray-400 flex-shrink-0" />
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

          {/* Cidade e UF */}
          <div className="flex gap-4">
            <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
              <MapPin size={20} className="text-gray-400 flex-shrink-0" />
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

            <select
              id="uf"
              value={formData.uf}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-20 bg-white border border-gray-300 rounded-lg px-3 text-sm text-gray-700 outline-none disabled:bg-gray-100"
            >
              <option value="">UF</option>
              {UF_OPTIONS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
            <Mail size={20} className="text-gray-400 flex-shrink-0" />
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

          {/* Senha */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
            <Lock size={20} className="text-gray-400 flex-shrink-0" />
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

          {/* Confirmar Senha */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
            <Lock size={20} className="text-gray-400 flex-shrink-0" />
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg mt-6 transition-colors"
          >
            {loading ? 'Processando...' : 'Concluir Cadastro'}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-sm text-gray-600">
          Já tem conta? <Link href="/login" className="text-blue-900 font-bold hover:underline">Acesse aqui</Link>
        </p>
      </div>
    </div>
  );
}
