"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  ArrowLeft,
  Bell,
  Building2,
  FileText,
  Folder,
  Globe,
  History,
  LogOut,
  Mail,
  Map,
  MapPin,
  Maximize,
  Phone,
  Save,
  SendHorizonal,
  Settings,
  ShieldCheck,
  Upload,
  User,
  UserPlus,
} from 'lucide-react';

export default function PerfilEngenheiro() {
  const [perfil, setPerfil] = useState({
    id: 0,
    nomeCompleto: '',
    crea: '',
    email: '',
    empresa: '',
    telefone: '',
    uf: '',
    cidade: '',
  });
  const [showPopUp, setShowPopUp] = useState(false);
  const [tipoEquipe, setTipoEquipe] = useState<'TECNICO' | 'COLABORADOR'>('TECNICO');
  const [convite, setConvite] = useState({
    nome: '',
    email: '',
    limiteAcesso: '',
  });
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await axios.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = response.data ?? {};
        setPerfil({
          id: data.id ?? 0,
          nomeCompleto: data.nome ?? '',
          crea: data.identificador_profissional ?? '',
          email: data.email ?? '',
          empresa: data.empresa ?? '',
          telefone: data.telefone ?? '',
          uf: data.uf ?? '',
          cidade: data.cidade ?? '',
        });
      } catch (error) {
        console.error('Erro ao buscar dados do supervisor logado:', error);
      }
    }

    fetchUserData();
  }, []);

  async function handleFinalizarCadastro() {
    if (!convite.nome.trim() || !convite.email.trim()) {
      window.alert('Preencha o nome e o e-mail do acesso.');
      return;
    }

    if (tipoEquipe === 'COLABORADOR' && !convite.limiteAcesso) {
      window.alert('Informe a data de expiração do acesso para o colaborador.');
      return;
    }

    if (!perfil.id) {
      window.alert('Não foi possível identificar o supervisor logado.');
      return;
    }

    try {
      setEnviandoConvite(true);

      const payload = {
        nome: convite.nome.trim(),
        id_profissional_responsavel: perfil.id,
        is_tecnico: tipoEquipe === 'TECNICO',
        email: convite.email.trim(),
        limite_acesso: tipoEquipe === 'COLABORADOR' ? `${convite.limiteAcesso}T00:00:00` : null,
      };

      await axios.post('/colaboradores', payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      window.alert('Cadastro realizado e e-mail enviado com sucesso.');
      setConvite({ nome: '', email: '', limiteAcesso: '' });
      setTipoEquipe('TECNICO');
    } catch (error) {
      console.error('Erro ao criar colaborador:', error);
      window.alert('Não foi possível finalizar o cadastro.');
    } finally {
      setEnviandoConvite(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* SIDEBAR */}
      <aside className="w-20 bg-[#1e2235] flex flex-col items-center py-6 shrink-0 min-h-screen border-r border-gray-800">
        <div className="p-3 bg-[#0a5483] rounded-xl text-white mb-10">
          <Activity size={26} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-9 items-center w-full mb-auto">
          {[
            { Icon: Folder, label: 'Arquivos' },
            { Icon: Upload, label: 'Enviar' },
            { Icon: Maximize, label: 'Expandir' },
            { Icon: FileText, label: 'Documentos' },
            { Icon: Map, label: 'Mapa' },
            { Icon: History, label: 'Histórico' },
          ].map(({ Icon, label }) => (
            <button key={label} type="button" title={label} aria-label={label} className="text-gray-400 hover:text-white transition-colors">
              <Icon size={22} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <div className="relative group cursor-pointer pb-4">
          <button type="button" title="Notificações" className="text-gray-400 group-hover:text-white transition-colors">
            <Bell size={26} strokeWidth={1.5} />
          </button>
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#1e2235] shadow-sm">
            3
          </span>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sistema de Monitoramento de Pavimentação</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Análise baseada em IA conforme normas DNIT</p>
          </div>
          
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setShowPopUp(!showPopUp)}
              className="flex items-center gap-3 hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <div className="text-right">
                <p className="font-bold text-sm text-gray-900">{perfil.nomeCompleto || 'Engenheiro(a)'}</p>
                <p className="text-xs text-gray-500 font-medium">{perfil.email || 'Engenheiro'}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                <User size={20} />
              </div>
            </button>

            {showPopUp && (
              <div className="absolute top-16 right-28 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <p className="font-bold text-sm text-gray-900">{perfil.nomeCompleto || 'Engenheiro(a)'}</p>
                  <p className="text-[11px] text-gray-500 italic font-medium">{perfil.email}</p>
                </div>
                <button 
                  onClick={() => setShowPopUp(false)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 text-sm text-gray-700 transition-colors group"
                >
                  <Settings size={16} className="text-gray-400 group-hover:text-blue-600" />
                  <span className="group-hover:text-blue-600 font-bold">Editar Perfil</span>
                </button>
              </div>
            )}

            <button className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm hover:bg-red-100 font-bold transition-all">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto space-y-10">
          <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-10">
              <ArrowLeft size={20} className="text-gray-600 cursor-pointer hover:text-blue-600" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Meu Perfil</h2>
                <p className="text-xs text-gray-500 font-medium italic mt-0.5">Gerencie suas informações pessoais e profissionais</p>
              </div>
            </div>

            <div className="flex items-center gap-5 border-b border-gray-100 pb-8">
              <div className="h-16 w-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-[#2d6a8e] shadow-sm shrink-0">
                <User size={30} />
              </div>
              <div>
                <h3 className="text-[22px] font-bold text-gray-900 leading-tight">
                  {perfil.nomeCompleto || 'Engenheiro(a)'}
                </h3>
                <p className="text-sm text-gray-600 font-medium">Engenheiro</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  CREA: {perfil.crea || 'SP-123456'}
                </p>
              </div>
            </div>

            <div className="mt-6 mb-8 rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3.5 text-blue-800">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shrink-0">
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <p className="text-[12px] font-bold leading-4">Campos protegidos</p>
                  <p className="text-[11px] leading-snug text-blue-600 font-medium">
                    O CREA e e-mail não podem ser alterados após o cadastro por questões de segurança e rastreabilidade.
                  </p>
                </div>
              </div>
            </div>

            {/* FORMULÁRIO COM CONTRASTE AJUSTADO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="md:col-span-2">
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <User size={14} className="text-gray-500" /> Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={perfil.nomeCompleto}
                  onChange={(e) => setPerfil({...perfil, nomeCompleto: e.target.value})}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              
              <div>
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <ShieldCheck size={14} className="text-gray-500" /> CREA
                </label>
                <input
                  type="text"
                  title="CREA"
                  aria-label="CREA"
                  value={perfil.crea}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3.5 text-sm text-gray-600 font-medium cursor-not-allowed italic shadow-inner"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <Mail size={14} className="text-gray-500" /> E-mail
                </label>
                <input
                  type="email"
                  title="E-mail"
                  aria-label="E-mail"
                  value={perfil.email}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3.5 text-sm text-gray-600 font-medium cursor-not-allowed italic shadow-inner"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <Building2 size={14} className="text-gray-500" /> Empresa/Órgão
                </label>
                <input
                  type="text"
                  title="Empresa/Órgão"
                  aria-label="Empresa/Órgão"
                  value={perfil.empresa}
                  onChange={(e) => setPerfil({...perfil, empresa: e.target.value})}
                  placeholder="Ex: DNIT, SOP/CE, Prefeitura..."
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <Phone size={14} className="text-gray-500" /> Telefone
                </label>
                <input
                  type="text"
                  title="Telefone"
                  aria-label="Telefone"
                  value={perfil.telefone}
                  onChange={(e) => setPerfil({...perfil, telefone: e.target.value})}
                  placeholder="(85) 99999-9999"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <Globe size={14} className="text-gray-500" /> Estado (UF)
                </label>
                <input
                  type="text"
                  title="Estado (UF)"
                  aria-label="Estado (UF)"
                  value={perfil.uf}
                  onChange={(e) => setPerfil({...perfil, uf: e.target.value})}
                  placeholder="CE"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-700 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <MapPin size={14} className="text-gray-500" /> Cidade
                </label>
                <input
                  type="text"
                  title="Cidade"
                  aria-label="Cidade"
                  value={perfil.cidade}
                  onChange={(e) => setPerfil({...perfil, cidade: e.target.value})}
                  placeholder="Ex: Fortaleza"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3.5 text-sm text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button className="bg-[#003e68] text-white px-10 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#002d4d] transition-all flex items-center gap-2">
                <Save size={16} /> Salvar Alterações
              </button>
              <button className="bg-gray-100 text-gray-700 px-10 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all border border-gray-300">Cancelar</button>
            </div>
          </section>

          {/* SEÇÃO AZUL (MANTIDA COM CONTRASTE DE TEXTO BRANCO PURO) */}
          <section className="bg-[#0a3d62] rounded-[2.5rem] p-10 text-white shadow-2xl relative">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                <UserPlus size={28} className="text-blue-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight">Adicionar à Equipe</h2>
                <p className="text-xs text-blue-200/60 font-medium">Gerencie o acesso de técnicos ou colaboradores.</p>
              </div>
            </div>

            <div className="bg-[#082a44] p-1.5 rounded-2xl flex mb-10 max-w-[320px] border border-white/5">
              <button
                onClick={() => setTipoEquipe('TECNICO')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${tipoEquipe === 'TECNICO' ? 'bg-white text-[#0a3d62]' : 'text-blue-200 hover:text-white'}`}
              >
                TÉCNICO
              </button>
              <button
                onClick={() => setTipoEquipe('COLABORADOR')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${tipoEquipe === 'COLABORADOR' ? 'bg-white text-[#0a3d62]' : 'text-blue-200 hover:text-white'}`}
              >
                COLABORADOR
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="text-[12px] font-bold text-blue-50 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <User size={14} className="text-blue-300" /> Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Maria Souza"
                  value={convite.nome}
                  onChange={(event) => setConvite((current) => ({ ...current, nome: event.target.value }))}
                  className="w-full p-3.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white font-medium placeholder:text-blue-200/50 outline-none focus:border-white/40 transition-all"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-blue-50 flex items-center gap-2 mb-2 uppercase tracking-tight">
                  <Mail size={14} className="text-blue-300" /> E-mail de Acesso
                </label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={convite.email}
                  onChange={(event) => setConvite((current) => ({ ...current, email: event.target.value }))}
                  className="w-full p-3.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white font-medium placeholder:text-blue-200/50 outline-none focus:border-white/40 transition-all"
                />
              </div>

              {tipoEquipe === 'COLABORADOR' && (
                <div>
                  <label className="text-[12px] font-bold text-blue-50 flex items-center gap-2 mb-2 uppercase tracking-tight">
                    Data de Expiração do Acesso
                  </label>
                  <input
                    type="date"
                    title="Data de expiração do acesso"
                    aria-label="Data de expiração do acesso"
                    value={convite.limiteAcesso}
                    onChange={(event) => setConvite((current) => ({ ...current, limiteAcesso: event.target.value }))}
                    className="w-full p-3.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white font-medium outline-none focus:border-white/40 transition-all scheme-dark"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinalizarCadastro}
              disabled={enviandoConvite}
              className="mt-8 bg-white text-[#0a3d62] w-full py-4 rounded-full font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-gray-100 transition-all disabled:opacity-70"
            >
              <SendHorizonal size={16} strokeWidth={2.5} />
              {enviandoConvite ? 'ENVIANDO...' : 'ADICIONAR COLABORADOR'}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}