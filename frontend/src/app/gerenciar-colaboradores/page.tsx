"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
	AlertTriangle,
	Building,
	Calendar,
	CheckCircle2,
	GraduationCap,
	LogOut,
	Mail,
	RefreshCw,
	Settings,
	User,
	UserMinus,
	X
} from "lucide-react";

import { clearAuthSession } from "../../lib/authApi";
import AppSidebar from "../../../components/AppSidebar";

// Tipagens
type CargoUsuario = "engenheiro" | "tecnico" | "supervisor" | "";

type Colaborador = {
	id: string;
	nome: string;
	email: string;
	instituicao: string;
	status: "Ativo" | "Expirado";
	dataExpiracao: string; // Formato YYYY-MM-DD
};

// Funções de utilidade
function canUseStorage() {
	return typeof window !== "undefined";
}

function getInitialUserState() {
	if (!canUseStorage()) return { nome: "Engenheiro(a)", cargo: "Engenheiro" };
	// Simulação de busca do usuário logado
	return { nome: "Engenheiro(a)", cargo: "Engenheiro" };
}

function formatDateForDisplay(value: string) {
	if (!value) return "Não definida";
	const parsed = new Date(`${value}T12:00:00`);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

function isExpiringSoon(dateStr: string) {
	const expDate = new Date(`${dateStr}T12:00:00`);
	const today = new Date();
	const diffTime = expDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays > 0 && diffDays <= 30;
}

// Dados iniciais mockados para demonstração
const mockColaboradores: Colaborador[] = [
	{
		id: "1",
		nome: "João Silva Santos",
		email: "joao.aluno@universidade.edu.br",
		instituicao: "UFC - Campus Quixadá",
		status: "Ativo",
		dataExpiracao: "2026-12-31",
	},
	{
		id: "2",
		nome: "Maria Oliveira",
		email: "maria.tecnica@cft.org.br",
		instituicao: "IFCE",
		status: "Ativo",
		dataExpiracao: "2026-06-25", // Próximo de expirar (baseado em Jun/2026)
	},
	{
		id: "3",
		nome: "Carlos Mendes",
		email: "carlos.mendes@ufc.br",
		instituicao: "UFC - Campus Pici",
		status: "Expirado",
		dataExpiracao: "2026-05-10",
	},
];

export default function CentralAcessosPage() {
	const router = useRouter();
	const pathname = usePathname();
	const [showPopUp, setShowPopUp] = useState(false);
	const [initialUserState] = useState(() => getInitialUserState());
	const [usuarioNome] = useState(initialUserState.nome);
	const [cargoUsuario] = useState(initialUserState.cargo);

	// Estados da Feature (US-06)
	const [colaboradores, setColaboradores] = useState<Colaborador[]>(mockColaboradores);
	const [abaAtiva, setAbaAtiva] = useState<"notificacoes" | "solicitacoes">("solicitacoes");
	const [subAbaAtiva, setSubAbaAtiva] = useState<"pendentes" | "vinculos">("vinculos");
	const [feedback, setFeedback] = useState<{ type: "success" | "warning"; message: string } | null>(null);

	// Estados dos Modais
	const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null);
	const [showModalRevogar, setShowModalRevogar] = useState(false);
	const [showModalRenovar, setShowModalRenovar] = useState(false);
	const [novaDataExpiracao, setNovaDataExpiracao] = useState("");

	function handleLogout() {
		clearAuthSession();
		router.push("/login");
	}

	// Ação: Iniciar Revogação
	function abrirModalRevogar(colaborador: Colaborador) {
		setColaboradorSelecionado(colaborador);
		setShowModalRevogar(true);
	}

	// Ação: Confirmar Revogação
	function confirmarRevogacao() {
		if (!colaboradorSelecionado) return;

		setColaboradores((prev) =>
			prev.map((c) =>
				c.id === colaboradorSelecionado.id ? { ...c, status: "Expirado" } : c
			)
		);

		setFeedback({ type: "success", message: `Acesso de ${colaboradorSelecionado.nome} foi revogado com sucesso.` });
		setShowModalRevogar(false);
		setColaboradorSelecionado(null);

		// Remove o feedback após 5 segundos
		setTimeout(() => setFeedback(null), 5000);
	}

	// Ação: Iniciar Renovação
	function abrirModalRenovar(colaborador: Colaborador) {
		setColaboradorSelecionado(colaborador);
		setNovaDataExpiracao(""); // Reseta a data no input
		setShowModalRenovar(true);
	}

	// Ação: Confirmar Renovação
	function confirmarRenovacao() {
		if (!colaboradorSelecionado || !novaDataExpiracao) return;

		setColaboradores((prev) =>
			prev.map((c) =>
				c.id === colaboradorSelecionado.id
					? { ...c, status: "Ativo", dataExpiracao: novaDataExpiracao }
					: c
			)
		);

		setFeedback({ type: "success", message: `Acesso de ${colaboradorSelecionado.nome} renovado até ${formatDateForDisplay(novaDataExpiracao)}.` });
		setShowModalRenovar(false);
		setColaboradorSelecionado(null);

		setTimeout(() => setFeedback(null), 5000);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
			<AppSidebar activePath={pathname} />

			<main className="flex-1 p-8 overflow-y-auto">
				{/* Header Padronizado */}
				<header className="flex justify-between items-start mb-10 border-b border-gray-200 pb-6">
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
							<div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm">
								<User size={20} />
							</div>
						</button>

						{showPopUp && (
							<div className="absolute top-16 right-28 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
								<button
									type="button"
									onClick={() => { setShowPopUp(false); router.push('/editar-perfil'); }}
									className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 text-sm text-gray-700 transition-colors group"
								>
									<Settings size={16} className="text-gray-400 group-hover:text-[#0a5483]" />
									<span className="group-hover:text-[#0a5483] font-bold">Editar Perfil</span>
								</button>
							</div>
						)}

						<button
							type="button"
							onClick={handleLogout}
							className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-sm hover:bg-red-100 font-bold transition-all"
						>
							Sair <LogOut size={16} />
						</button>
					</div>
				</header>

				{/* Título da Página e Abas */}
				<div className="mb-6">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
							<AlertTriangle size={24} className="text-[#0a5483]" />
						</div>
						<h2 className="text-2xl font-extrabold text-gray-900">Central de Avisos e Acessos</h2>
					</div>
					<p className="text-sm text-gray-500 font-medium mb-8">Gerencie alertas do sistema e permissões de dependentes.</p>

					{/* Feedback de Sucesso/Aviso */}
					{feedback && (
						<div className={`mb-6 rounded-2xl border px-5 py-4 shadow-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
							<div className="flex items-start gap-3">
								<CheckCircle2 size={18} className="mt-0.5 shrink-0" />
								<p className="text-sm font-medium leading-6">{feedback.message}</p>
							</div>
						</div>
					)}

					<div className="flex border-b border-gray-200 mb-6">
						<button
							onClick={() => setAbaAtiva("notificacoes")}
							className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${abaAtiva === "notificacoes" ? "border-[#0a5483] text-[#0a5483]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
						>
							Notificações
							<span className="w-2 h-2 rounded-full bg-red-500"></span>
						</button>
						<button
							onClick={() => setAbaAtiva("solicitacoes")}
							className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${abaAtiva === "solicitacoes" ? "border-[#0a5483] text-[#0a5483]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
						>
							Solicitações de Acesso
							<span className="w-2 h-2 rounded-full bg-blue-500"></span>
						</button>
					</div>

					{abaAtiva === "solicitacoes" && (
						<>
							<div className="flex gap-2 mb-6">
								<button
									onClick={() => setSubAbaAtiva("pendentes")}
									className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${subAbaAtiva === "pendentes" ? "bg-[#0a5483] text-white shadow-sm" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
								>
									Pendentes
								</button>
								<button
									onClick={() => setSubAbaAtiva("vinculos")}
									className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${subAbaAtiva === "vinculos" ? "bg-[#0a5483] text-white shadow-sm" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
								>
									Vínculos Ativos
								</button>
							</div>

							{/* Lista de Colaboradores Vinculados */}
							{subAbaAtiva === "vinculos" && (
								<div className="space-y-4">
									{colaboradores.length === 0 ? (
										<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
											Nenhum colaborador vinculado no momento.
										</div>
									) : (
										colaboradores.map((colab) => {
											const expiraEmBreve = colab.status === "Ativo" && isExpiringSoon(colab.dataExpiracao);

											return (
												<div key={colab.id} className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow gap-4">
													<div className="flex items-center gap-4 w-full sm:w-auto">
														<div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">
															<GraduationCap size={24} />
														</div>
														<div>
															<div className="flex items-center gap-2">
																<h3 className="font-bold text-gray-900 text-base">{colab.nome}</h3>
																{colab.status === "Ativo" ? (
																	<span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">Ativo</span>
																) : (
																	<span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 rounded-full">Expirado</span>
																)}
															</div>
															<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-gray-500">
																<span className="flex items-center gap-1.5"><Mail size={14} /> {colab.email}</span>
																<span className="hidden sm:inline text-gray-300">•</span>
																<span className="flex items-center gap-1.5"><Building size={14} /> {colab.instituicao}</span>
															</div>
															
															{/* Informação de Expiração e Alerta de 30 dias */}
															<div className="flex items-center gap-2 mt-2">
																<span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
																	<Calendar size={14} />
																	Expira em: {formatDateForDisplay(colab.dataExpiracao)}
																</span>
																{expiraEmBreve && (
																	<span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
																		<AlertTriangle size={12} /> Expira em menos de 30 dias
																	</span>
																)}
															</div>
														</div>
													</div>

													{/* Ações */}
													<div className="flex w-full sm:w-auto gap-3 shrink-0">
														{colab.status === "Ativo" ? (
															<>
																<button
																	onClick={() => abrirModalRenovar(colab)}
																	className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-[#0a5483] bg-blue-50 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
																>
																	<RefreshCw size={16} /> Renovar
																</button>
																<button
																	onClick={() => abrirModalRevogar(colab)}
																	className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 bg-white rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
																>
																	<UserMinus size={16} /> Desvincular
																</button>
															</>
														) : (
															<button
																onClick={() => abrirModalRenovar(colab)}
																className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#0a5483] text-white rounded-xl text-sm font-bold hover:bg-[#083d61] shadow-sm transition-colors"
															>
																<RefreshCw size={16} /> Reativar Acesso
															</button>
														)}
													</div>
												</div>
											);
										})
									)}
								</div>
							)}
						</>
					)}
				</div>

				{/* Modal de Confirmação de Revogação */}
				{showModalRevogar && colaboradorSelecionado && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
						<div className="w-full max-w-md overflow-hidden rounded-[30px] bg-white p-6 shadow-2xl">
							<div className="flex justify-between items-center mb-5">
								<h2 className="text-xl font-black text-slate-900">Revogar Acesso</h2>
								<button onClick={() => setShowModalRevogar(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
							</div>
							
							<div className="bg-red-50 text-red-800 p-4 rounded-2xl mb-6 border border-red-100 text-sm leading-relaxed">
								Você está prestes a revogar o acesso de <strong>{colaboradorSelecionado.nome}</strong>. 
								O status mudará para <span className="font-bold">Expirado</span> imediatamente e este colaborador não poderá mais acessar o sistema.
							</div>
							
							<div className="flex gap-3">
								<button onClick={() => setShowModalRevogar(false)} className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
									Cancelar
								</button>
								<button onClick={confirmarRevogacao} className="flex-1 px-4 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors">
									Sim, revogar acesso
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Modal de Renovação de Acesso */}
				{showModalRenovar && colaboradorSelecionado && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
						<div className="w-full max-w-md overflow-hidden rounded-[30px] bg-white p-6 shadow-2xl">
							<div className="flex justify-between items-center mb-5">
								<h2 className="text-xl font-black text-slate-900">Renovar Acesso</h2>
								<button onClick={() => setShowModalRenovar(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
							</div>
							
							<div className="mb-6">
								<p className="text-sm text-slate-600 mb-4">
									Defina a nova data limite de acesso para <strong>{colaboradorSelecionado.nome}</strong>.
								</p>
								
								<label htmlFor="nova-data" className="block text-sm font-bold text-slate-800 mb-2">
									Nova data de expiração
								</label>
								<input 
									id="nova-data" 
									type="date" 
									value={novaDataExpiracao}
									onChange={(e) => setNovaDataExpiracao(e.target.value)}
									min={new Date().toISOString().split("T")[0]} // Não permite datas passadas
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100 focus:bg-white" 
								/>
							</div>
							
							<div className="flex gap-3">
								<button onClick={() => setShowModalRenovar(false)} className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
									Cancelar
								</button>
								<button 
									onClick={confirmarRenovacao} 
									disabled={!novaDataExpiracao}
									className="flex-1 px-4 py-3 rounded-2xl bg-[#0a5483] text-white font-bold hover:bg-[#083d61] shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									Confirmar Renovação
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}