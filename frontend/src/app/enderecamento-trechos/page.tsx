"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Activity, Bell, CheckCircle2, FileText, Folder, History, LogOut, Map, Maximize, Route, Settings, Upload, User } from "lucide-react";

import { clearAuthSession } from "../../lib/authApi";
import { readConfirmationSummary } from "../../lib/map-review";

type UserState = {
  nome: string;
  cargo: string;
};

function getInitialUserState(): UserState {
  if (typeof window === "undefined") {
    return {
      nome: "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  }

  const usuarioJson = window.localStorage.getItem("usuario");

  if (!usuarioJson) {
    return {
      nome: "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  }

  try {
    const usuario = JSON.parse(usuarioJson) as { nome?: string };

    return {
      nome: usuario.nome?.trim() || "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  } catch {
    return {
      nome: "Engenheiro(a)",
      cargo: "Engenheiro",
    };
  }
}

export default function EnderecamentoTrechosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [showPopUp, setShowPopUp] = useState(false);
  const [initialUserState] = useState<UserState>(() => getInitialUserState());
  const [usuarioNome] = useState(initialUserState.nome);
  const [cargoUsuario] = useState(initialUserState.cargo);
  const [summary] = useState<{ confirmedAt?: string; total?: number } | null>(() => readConfirmationSummary());

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <aside className="w-20 bg-[#1e2235] flex flex-col items-center py-6 shrink-0 min-h-screen border-r border-gray-800">
        <div className="p-3 bg-[#0a5483] rounded-xl text-white mb-10">
          <Activity size={26} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-9 items-center w-full mb-auto">
          {[
            { Icon: Folder, label: "Arquivos", href: "/arquivos" },
            { Icon: Upload, label: "Enviar", href: "/upload-imagens" },
            { Icon: Maximize, label: "Expandir", href: "/expandir" },
            { Icon: FileText, label: "Documentos", href: "/documentos" },
            { Icon: Map, label: "Mapa", href: "/mapa" },
            { Icon: History, label: "Histórico", href: "/historico" },
          ].map(({ Icon, label, href }) => {
            const isActive = href === "/upload-imagens";

            return (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => router.push(href)}
                className={`transition-all duration-200 p-2 rounded-xl ${
                  isActive
                    ? "bg-[#0a5483] text-white shadow-[0_8px_24px_rgba(10,84,131,0.35)]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              </button>
            );
          })}
        </div>
        <div className="relative group mt-auto cursor-pointer pb-4">
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
              type="button"
              onClick={() => setShowPopUp(!showPopUp)}
              className="flex items-center gap-3 hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <div className="text-right">
                <p className="font-bold text-sm text-gray-900">{usuarioNome}</p>
                <p className="text-xs text-gray-500 font-medium">{cargoUsuario}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                <User size={20} />
              </div>
            </button>

            {showPopUp && (
              <div className="absolute top-16 right-28 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <p className="font-bold text-sm text-gray-900">{usuarioNome}</p>
                  <p className="text-[11px] text-gray-500 italic font-medium">{cargoUsuario}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPopUp(false);
                    router.push("/editar-perfil");
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 text-sm text-gray-700 transition-colors group"
                >
                  <Settings size={16} className="text-gray-400 group-hover:text-blue-600" />
                  <span className="group-hover:text-blue-600 font-bold">Editar Perfil</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm hover:bg-red-100 font-bold transition-all"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto space-y-10">
          <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-10">
              <Route size={20} className="text-gray-600" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Endereçamento de Trechos</h2>
                <p className="text-xs text-gray-500 font-medium italic mt-0.5">Fluxo consolidado a partir da revisão do mapa</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5" />
                <div>
                  <p className="font-black">Revisão confirmada</p>
                  <p className="mt-1 text-sm leading-6">
                    {summary?.total
                      ? `${summary.total} inspeção(ões) foram consolidadas para o próximo fluxo.`
                      : "As inspeções foram consolidadas e o fluxo está pronto para avançar."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Estado da revisão</p>
                <p className="mt-2 text-lg font-black text-slate-900">Concluída no mapa</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Confirmado em</p>
                <p className="mt-2 text-lg font-black text-slate-900">{summary?.confirmedAt ? new Date(summary.confirmedAt).toLocaleString("pt-BR") : "Agora"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={() => router.push("/mapa")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Map size={16} />
                Voltar ao mapa
              </button>
              <button
                type="button"
                onClick={() => router.push("/upload-imagens")}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0a5483] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(10,84,131,0.22)] transition hover:bg-[#083d61]"
              >
                Seguir para novo lote
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}