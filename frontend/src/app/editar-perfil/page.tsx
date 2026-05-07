"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { authApi, clearAuthSession, SessionExpiredError } from '@/lib/authApi';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type CargoUsuario = 'supervisor' | 'tecnico' | 'colaborador' | '';

type PerfilState = {
  id: number;
  nomeCompleto: string;
  crea: string;
  cft: string;
  email: string;
  empresa: string;
  telefone: string;
  uf: string;
  cidade: string;
  cargo: CargoUsuario;
};

function formatarCargo(cargo: CargoUsuario) {
  if (cargo === 'supervisor') return 'Engenheiro';
  if (cargo === 'tecnico') return 'Técnico';
  if (cargo === 'colaborador') return 'Colaborador';
  return 'Engenheiro';
}

function emailEhValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extrairMensagemErroApi(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Não foi possível finalizar o cadastro.';
  }

  const data = error.response?.data as
    | { detail?: unknown; message?: unknown; error?: unknown }
    | string
    | undefined;

  const detalhe = typeof data === 'string'
    ? data
    : data?.detail ?? data?.message ?? data?.error;

  const mensagem = Array.isArray(detalhe)
    ? detalhe
        .map((item) => (typeof item === 'string' ? item : item?.msg ?? item?.message ?? ''))
        .filter(Boolean)
        .join(' ')
    : typeof detalhe === 'string'
      ? detalhe
      : '';

  if (/e-?mail.*já.*cadastrad/i.test(mensagem) || /já.*cadastrad.*e-?mail/i.test(mensagem)) {
    return 'E-mail já cadastrado. Utilize outro e-mail.';
  }

  if (mensagem.trim()) {
    return mensagem;
  }

  return 'Não foi possível finalizar o cadastro.';
}

type FeedbackPopupState = {
  title: string;
  message: string;
  type: 'success' | 'error';
} | null;

function obterFeedbackErro(message: string) {
  if (/cft\/?cpf.*obrigat|vazio|informe o cft/i.test(message)) {
    return {
      title: 'CFT/CPF obrigatório',
      message: 'Informe o CFT/CPF do técnico antes de finalizar o cadastro.',
    };
  }

  if (/cft\/?cpf.*apenas números|somente números|caracteres inválidos|inválido/i.test(message)) {
    return {
      title: 'CFT/CPF inválido',
      message: 'O CFT/CPF deve conter apenas números.',
    };
  }

  if (/cft\/?cpf.*já cadastrado|cft\/?cpf.*em uso|duplicad/i.test(message)) {
    return {
      title: 'CFT/CPF duplicado',
      message: 'Este CFT/CPF já está em uso no sistema. Use outro identificador.',
    };
  }

  if (/e-?mail.*já.*cadastrad/i.test(message) || /já.*cadastrad.*e-?mail/i.test(message)) {
    return {
      title: 'E-mail duplicado',
      message: 'O e-mail informado já está cadastrado. Utilize outro e-mail.',
    };
  }

  return {
    title: 'Erro ao cadastrar',
    message,
  };
}

export default function EditarPerfilPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [perfil, setPerfil] = useState<PerfilState>({
    id: 0,
    nomeCompleto: '',
    crea: '',
    cft: '',
    email: '',
    empresa: '',
    telefone: '',
    uf: '',
    cidade: '',
    cargo: '',
  });
  const [showPopUp, setShowPopUp] = useState(false);
  const [tipoEquipe, setTipoEquipe] = useState<'TECNICO' | 'COLABORADOR'>('TECNICO');
  const [convite, setConvite] = useState({
    nome: '',
    email: '',
    cft: '',
    limiteAcesso: '',
  });
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [feedbackPopup, setFeedbackPopup] = useState<FeedbackPopupState>(null);

  function mostrarFeedback(message: string, type: 'success' | 'error', title?: string) {
    setFeedbackPopup({
      title: title ?? (type === 'success' ? 'Concluído' : 'Atenção'),
      message,
      type,
    });
  }

  function fecharFeedback() {
    setFeedbackPopup(null);
  }

  function dataEhValidaParaColaborador(dataIso: string) {
    if (!dataIso) {
      return false;
    }

    const dataSelecionada = new Date(`${dataIso}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return dataSelecionada >= hoje;
  }

  function limparFormularioConvite() {
    setConvite({
      nome: '',
      email: '',
      cft: '',
      limiteAcesso: '',
    });
  }

  async function handleLogout() {
    try {
      await authApi.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      clearAuthSession();
      router.replace('/login');
    }
  }

  useEffect(() => {
    async function fetchUserData() {
      try {
        const usuarioJson = localStorage.getItem('usuario');
        const usuario = usuarioJson ? JSON.parse(usuarioJson) : null;
        const cargo = (usuario?.cargo ?? '') as CargoUsuario;

        if (!usuario) {
          console.warn('Nenhum usuário encontrado no localStorage');
          return;
        }

        setPerfil((current) => ({
          ...current,
          id: usuario.id ?? 0,
          nomeCompleto: usuario.nome ?? current.nomeCompleto,
          email: usuario.email ?? current.email,
          crea: usuario.crea ?? usuario.identificador_profissional ?? current.crea,
          cft: usuario.cft ?? usuario.cpf ?? current.cft,
          empresa: usuario.empresa ?? current.empresa,
          telefone: usuario.telefone ?? current.telefone,
          uf: usuario.uf ?? current.uf,
          cidade: usuario.cidade ?? current.cidade,
          cargo,
        }));

        if (cargo !== 'supervisor') {
          return;
        }

        const tokenAcesso = localStorage.getItem('token_acesso');
        if (!tokenAcesso) {
          console.warn('Token de acesso não encontrado no localStorage');
          return;
        }

        const resposta = await authApi.get('/auth/me');

        const supervisor = resposta.data;

        setPerfil((current) => ({
          ...current,
          id: supervisor.id ?? current.id,
          nomeCompleto: supervisor.nome ?? current.nomeCompleto,
          crea: supervisor.identificador_profissional ?? current.crea,
          email: supervisor.email ?? current.email,
          empresa: supervisor.empresa ?? current.empresa,
          telefone: supervisor.telefone ?? current.telefone,
          uf: supervisor.uf ?? current.uf,
          cidade: supervisor.cidade ?? current.cidade,
          cargo: cargo || 'supervisor',
        }));

        localStorage.setItem(
          'usuario',
          JSON.stringify({
            ...usuario,
            id: supervisor.id ?? usuario.id,
            nome: supervisor.nome ?? usuario.nome,
            email: supervisor.email ?? usuario.email,
            crea: supervisor.identificador_profissional ?? usuario.crea ?? usuario.identificador_profissional,
            identificador_profissional: supervisor.identificador_profissional ?? usuario.identificador_profissional,
            empresa: supervisor.empresa ?? usuario.empresa,
            telefone: supervisor.telefone ?? usuario.telefone,
            uf: supervisor.uf ?? usuario.uf,
            cidade: supervisor.cidade ?? usuario.cidade,
            cargo: cargo || 'supervisor',
          })
        );
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          return;
        }

        console.error('Erro ao buscar dados do supervisor logado:', error);
      }
    }

    fetchUserData();
  }, []);

  async function handleFinalizarCadastro() {
    console.log('=== INICIANDO CADASTRO DE COLABORADOR ===');
    console.log('Perfil atual:', perfil);
    console.log('ID do perfil:', perfil.id);
    console.log('Tipo de equipe:', tipoEquipe);
    console.log('Convite:', convite);
    
    if (!convite.nome.trim() || !convite.email.trim()) {
      mostrarFeedback('Preencha os campos obrigatórios do acesso.', 'error', 'Campos obrigatórios');
      return;
    }

    const emailInformado = convite.email.trim();

    if (!emailEhValido(emailInformado)) {
      mostrarFeedback('E-mail inválido. Informe um e-mail válido.', 'error', 'E-mail inválido');
      return;
    }

    if (tipoEquipe === 'TECNICO' && !convite.cft.trim()) {
      mostrarFeedback('Informe o CFT/CPF do técnico.', 'error', 'CFT/CPF obrigatório');
      return;
    }

    if (tipoEquipe === 'COLABORADOR' && !convite.limiteAcesso) {
      mostrarFeedback('Informe a data de expiração do acesso para o colaborador.', 'error', 'Data obrigatória');
      return;
    }

    if (tipoEquipe === 'COLABORADOR' && !dataEhValidaParaColaborador(convite.limiteAcesso)) {
      mostrarFeedback('A data de expiração do acesso não pode estar no passado.', 'error', 'Data inválida');
      return;
    }

    if (!perfil.id) {
      console.error('ERRO: perfil.id é', perfil.id);
      mostrarFeedback('Não foi possível identificar o supervisor logado. Tente fazer login novamente.', 'error', 'Sessão inválida');
      return;
    }

    try {
      setEnviandoConvite(true);

      const payload = {
        nome: convite.nome.trim(),
        id_profissional_responsavel: parseInt(String(perfil.id), 10),
        is_tecnico: tipoEquipe === 'TECNICO',
        email: emailInformado,
        cft: tipoEquipe === 'TECNICO' ? convite.cft.trim() : null,
        limite_acesso: tipoEquipe === 'COLABORADOR' && convite.limiteAcesso
          ? new Date(
              `${convite.limiteAcesso}T23:59:59`
            ).toISOString()
          : null,
      };

      console.log('Payload a enviar:', payload);
      console.log('Token de acesso:', 'armazenado em HttpOnly cookie');
      
      const response = await authApi.post('/api/colaboradores', payload);
      
      console.log('Resposta do servidor:', response.data);
      mostrarFeedback('Cadastro realizado e e-mail enviado com sucesso.', 'success', 'Cadastro concluído');
      setConvite({ nome: '', email: '', cft: '', limiteAcesso: '' });
      setTipoEquipe('TECNICO');
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        return;
      }

      console.error('Erro completo ao criar colaborador:', error);
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Dados do erro:', error.response?.data);
      }
      const feedbackErro = obterFeedbackErro(extrairMensagemErroApi(error));
      mostrarFeedback(feedbackErro.message, 'error', feedbackErro.title);
    } finally {
      setEnviandoConvite(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {feedbackPopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-8">
          <div className="absolute inset-0 bg-black/30" onClick={fecharFeedback} />
          <div
            className={`relative w-full max-w-md rounded-2xl border shadow-2xl px-5 py-4 flex items-start gap-3 ${feedbackPopup.type === 'success'
              ? 'bg-[#E6FFF0] border-[#B7F5D8] text-[#15803D]'
              : 'bg-[#FFF1F2] border-[#FECACA] text-[#B91C1C]'
            }`}
            role="alert"
            aria-live="assertive"
          >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${feedbackPopup.type === 'success' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}>
              {feedbackPopup.type === 'success' ? '✓' : '!'}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] opacity-80">{feedbackPopup.title}</p>
              <p className="mt-1 font-semibold text-sm sm:text-base leading-snug">{feedbackPopup.message}</p>
            </div>
            <button
              type="button"
              onClick={fecharFeedback}
              className="ml-2 rounded-full px-2 py-1 text-sm font-bold hover:bg-black/5"
              aria-label="Fechar mensagem"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <aside className="w-20 bg-[#1e2235] flex flex-col items-center py-6 shrink-0 min-h-screen border-r border-gray-800">
        <div className="p-3 bg-[#0a5483] rounded-xl text-white mb-10">
          <Activity size={26} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-9 items-center w-full mb-auto">
          {[
            { Icon: Folder, label: 'Arquivos' },
            { Icon: Upload, label: 'Enviar', href: '/upload-imagens' },
            { Icon: Maximize, label: 'Expandir' },
            { Icon: FileText, label: 'Documentos' },
            { Icon: Map, label: 'Mapa' },
            { Icon: History, label: 'Histórico' },
          ].map(({ Icon, label, href }) => {
            const isActive = Boolean(href && pathname === href);

            return (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => {
                if (href) {
                  router.push(href);
                }
              }}
              className={`transition-all duration-200 p-2 rounded-xl ${
                isActive
                  ? 'bg-[#0a5483] text-white shadow-[0_8px_24px_rgba(10,84,131,0.35)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            </button>
          );
          })}
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
                <p className="text-xs text-gray-500 font-medium">{formatarCargo(perfil.cargo)}</p>
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
                  onClick={() => {
                    setShowPopUp(false);
                    router.push('/editar-perfil');
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 text-sm text-gray-700 transition-colors group"
                >
                  <Settings size={16} className="text-gray-400 group-hover:text-blue-600" />
                  <span className="group-hover:text-blue-600 font-bold">Editar Perfil</span>
                </button>
              </div>
            )}

            <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm hover:bg-red-100 font-bold transition-all">
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
                <p className="text-sm text-gray-600 font-medium">{formatarCargo(perfil.cargo)}</p>
                {perfil.cargo === 'tecnico' ? (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    CFT / CPF: {perfil.cft || 'Não informado'}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    CREA: {perfil.crea || 'Não informado'}
                  </p>
                )}
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
                {perfil.cargo === 'tecnico' ? (
                  <input
                    type="text"
                    title="CFT / CPF"
                    aria-label="CFT / CPF"
                    value={perfil.cft}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3.5 text-sm text-gray-600 font-medium cursor-not-allowed italic shadow-inner"
                  />
                ) : (
                  <input
                    type="text"
                    title="CREA"
                    aria-label="CREA"
                    value={perfil.crea}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3.5 text-sm text-gray-600 font-medium cursor-not-allowed italic shadow-inner"
                  />
                )}
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
                onClick={() => {
                  setTipoEquipe('TECNICO');
                  limparFormularioConvite();
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${tipoEquipe === 'TECNICO' ? 'bg-white text-[#0a3d62]' : 'text-blue-200 hover:text-white'}`}
              >
                TÉCNICO
              </button>
              <button
                onClick={() => {
                  setTipoEquipe('COLABORADOR');
                  limparFormularioConvite();
                }}
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
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="email@exemplo.com"
                  value={convite.email}
                  onChange={(event) => setConvite((current) => ({ ...current, email: event.target.value }))}
                  className="w-full p-3.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white font-medium placeholder:text-blue-200/50 outline-none focus:border-white/40 transition-all"
                />
              </div>

              {tipoEquipe === 'TECNICO' && (
                <div>
                  <label className="text-[12px] font-bold text-blue-50 flex items-center gap-2 mb-2 uppercase tracking-tight">
                    <ShieldCheck size={14} className="text-blue-300" /> CFT / CPF
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required={tipoEquipe === 'TECNICO'}
                    placeholder="CPF do técnico"
                    value={convite.cft}
                    onChange={(event) => setConvite((current) => ({ ...current, cft: event.target.value.replace(/\D/g, '') }))}
                    className="w-full p-3.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white font-medium placeholder:text-blue-200/50 outline-none focus:border-white/40 transition-all"
                  />
                </div>
              )}

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