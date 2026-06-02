"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
	ArrowRight,
	CheckCircle2,
	ChevronRight,
	ClipboardList,
	LogOut,
	Plus,
	Settings,
	User,
} from "lucide-react";

import { clearAuthSession } from "../../lib/authApi";
import AppSidebar from "../../../components/AppSidebar";

type CargoUsuario = "supervisor" | "tecnico" | "colaborador" | "";

type UsuarioStorage = {
	nome?: string;
	cargo?: CargoUsuario | string;
};

type InspectionDraftStorage = {
	inspectionDate: string;
	responsibleName: string;
	responsibleIdentifier: string;
	selectedCollaboratorIds: string[];
	savedAt: string;
};

const INSPECTION_METADATA_KEY = "smp:us13-inspection-metadata";
const INSPECTION_DRAFT_KEY = "smp:us13-inspection-draft";

function canUseStorage() {
	return typeof window !== "undefined";
}

function parseJson<T>(value: string | null) {
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

function getInitialUserState() {
	if (!canUseStorage()) {
		return { nome: "Engenheiro(a)", cargo: "Engenheiro" };
	}

	const usuario = parseJson<UsuarioStorage>(window.localStorage.getItem("usuario"));

	return {
		nome: usuario?.nome?.trim() || "Engenheiro(a)",
		cargo: usuario?.cargo === "tecnico" ? "Técnico" : usuario?.cargo === "colaborador" ? "Colaborador" : "Engenheiro",
	};
}

function getInitialInspectionState(userName: string) {
	if (!canUseStorage()) {
		return {
			inspectionDate: "",
			responsibleName: userName,
			responsibleIdentifier: "",
			selectedCollaboratorIds: [] as string[],
			metadataDetected: false,
		};
	}

	const metadata = parseJson<{ inspectionDate?: string; dataInspecao?: string; date?: string }>(window.sessionStorage.getItem(INSPECTION_METADATA_KEY));
	const draft = parseJson<InspectionDraftStorage>(window.sessionStorage.getItem(INSPECTION_DRAFT_KEY));
	const metadataDate = formatDateForInput(metadata?.inspectionDate ?? metadata?.dataInspecao ?? metadata?.date ?? null);

	return {
		inspectionDate: metadataDate || draft?.inspectionDate || "",
		responsibleName: draft?.responsibleName || userName,
		responsibleIdentifier: draft?.responsibleIdentifier || "",
		selectedCollaboratorIds: draft?.selectedCollaboratorIds || [],
		metadataDetected: Boolean(metadataDate),
	};
}

function formatDateForInput(value?: string | null) {
	if (!value) {
		return "";
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function formatDateForDisplay(value: string) {
	if (!value) {
		return "Pendente";
	}

	const parsed = new Date(`${value}T12:00:00`);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

export default function MeusTrabalhosPage() {
	const router = useRouter();
	const pathname = usePathname();
	const [showPopUp, setShowPopUp] = useState(false);
	const [showNovaInspecao, setShowNovaInspecao] = useState(false);
	const [initialUserState] = useState(() => getInitialUserState());
	const [initialInspectionState] = useState(() => getInitialInspectionState(initialUserState.nome));
	const [usuarioNome] = useState(initialUserState.nome);
	const [cargoUsuario] = useState(initialUserState.cargo);
	const [inspectionDate, setInspectionDate] = useState(initialInspectionState.inspectionDate);
	const [responsibleName, setResponsibleName] = useState(initialInspectionState.responsibleName);
	const [responsibleIdentifier, setResponsibleIdentifier] = useState(initialInspectionState.responsibleIdentifier);
	const selectedCollaboratorIds = initialInspectionState.selectedCollaboratorIds;
	const [feedback, setFeedback] = useState<{ type: "success" | "warning"; message: string } | null>(null);
	const [metadataDetected, setMetadataDetected] = useState(initialInspectionState.metadataDetected);

	const summaryCards = [
		{ label: "Trabalhos em andamento", value: "0", tone: "blue" },
		{ label: "Inspeções concluídas", value: "0", tone: "emerald" },
		{ label: "Nova inspeção", value: selectedCollaboratorIds.length ? `${selectedCollaboratorIds.length} colaborador(es)` : "Aguardando abertura", tone: "slate" },
	] as const;

	function handleLogout() {
		clearAuthSession();
		router.push("/login");
	}

	function toneClasses(tone: "slate" | "blue" | "emerald") {
		if (tone === "blue") return "border-blue-100 bg-blue-50 text-blue-900";
		if (tone === "emerald") return "border-emerald-100 bg-emerald-50 text-emerald-900";
		return "border-slate-200 bg-white text-slate-900";
	}

	function handleCreateInspection() {
		if (!inspectionDate) {
			setFeedback({ type: "warning", message: "Informe a data da inspeção antes de criar a nova inspeção." });
			return;
		}

		if (!responsibleName.trim()) {
			setFeedback({ type: "warning", message: "Informe o responsável técnico antes de continuar." });
			return;
		}

		if (!canUseStorage()) {
			router.push("/upload-imagens");
			return;
		}

		const payload: InspectionDraftStorage = {
			inspectionDate,
			responsibleName,
			responsibleIdentifier,
			selectedCollaboratorIds,
			savedAt: new Date().toISOString(),
		};

		window.sessionStorage.setItem(INSPECTION_DRAFT_KEY, JSON.stringify(payload));
		window.sessionStorage.setItem(
			INSPECTION_METADATA_KEY,
			JSON.stringify({ inspectionDate, dataInspecao: inspectionDate, date: inspectionDate })
		);

		setShowNovaInspecao(false);
		setFeedback({ type: "success", message: "Nova inspeção criada. Seguindo para upload de imagens." });
		router.push("/upload-imagens");
	}

	return (
		<div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
			<AppSidebar activePath={pathname} />

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
										router.push('/editar-perfil');
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

				<div className="mb-8 flex items-center justify-between gap-4">
					<div>
						<h2 className="text-2xl font-extrabold text-gray-900">Meus trabalhos</h2>
						<p className="text-xs text-gray-500 font-medium italic mt-0.5">Acompanhe inspeções ou inicie uma nova</p>
					</div>
					<button
						type="button"
						onClick={() => setShowNovaInspecao(true)}
						className="inline-flex items-center gap-2 rounded-xl bg-[#0a5483] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083d61]"
					>
						<Plus size={16} /> Nova inspeção
					</button>
				</div>

				{feedback && (
					<div className={`mb-6 rounded-3xl border px-5 py-4 shadow-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
						<div className="flex items-start gap-3">
							<CheckCircle2 size={18} className="mt-0.5 shrink-0" />
							<p className="text-sm font-medium leading-6">{feedback.message}</p>
						</div>
					</div>
				)}

				<div className="grid gap-3 sm:grid-cols-3">
					{summaryCards.map((card) => (
						<div key={card.label} className={`rounded-2xl border px-4 py-3 shadow-sm ${toneClasses(card.tone)}`}>
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
							<p className="mt-1 text-sm font-black text-slate-900">{card.value}</p>
						</div>
					))}
				</div>

				<div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
					<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a5483] text-white shadow-lg shadow-cyan-950/20">
								<ClipboardList size={20} strokeWidth={2.2} />
							</div>
							<div>
								<h2 className="text-xl font-black text-slate-950">Trabalhos</h2>
								<p className="text-sm text-slate-500">A lista está vazia por enquanto. Crie uma nova inspeção no botão acima para começar.</p>
							</div>
						</div>

						<div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
							Nenhum trabalho cadastrado no momento.
						</div>
					</section>

					<aside className="space-y-6">
						<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
							<div className="flex items-center gap-3">
								<div>
									<h3 className="text-lg font-black text-slate-950">Equipe</h3>
									<p className="text-sm text-slate-500">Sem colaboradores adicionados por enquanto.</p>
								</div>
							</div>

							<div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
								Nenhum colaborador disponível ainda.
							</div>
						</div>

					</aside>
				</div>

				{showNovaInspecao && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
						<div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.25)]">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Preencha os dados da inspeção</h2>
								</div>

								<button
									type="button"
									onClick={() => setShowNovaInspecao(false)}
									className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
									aria-label="Fechar pop-up"
								>
									×
								</button>
							</div>

							<div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
								<div className="space-y-5">
									<div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
										<p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Dados principais</p>
										<div className="mt-4 grid gap-4 md:grid-cols-2">
											<div>
												<label htmlFor="inspection-date" className="mb-1 block text-sm font-bold text-slate-800">Data da inspeção</label>
												<input id="inspection-date" type="date" value={inspectionDate} onChange={(event) => { setInspectionDate(event.target.value); setMetadataDetected(false); }} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100" />
												<p className="mt-2 text-xs text-slate-500">{metadataDetected ? "Preenchido a partir dos metadados encontrados." : "Informe manualmente se não houver metadados."}</p>
											</div>

											<div>
												<label htmlFor="responsible-name" className="mb-1 block text-sm font-bold text-slate-800">Responsável técnico</label>
												<input id="responsible-name" type="text" value={responsibleName} onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nome do responsável técnico" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100" />
												<label htmlFor="responsible-identifier" className="mb-1 mt-3 block text-sm font-bold text-slate-800">Identificador</label>
												<input id="responsible-identifier" type="text" value={responsibleIdentifier} onChange={(event) => setResponsibleIdentifier(event.target.value)} placeholder="CREA / CFT / CPF" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0a5483] focus:ring-4 focus:ring-cyan-100" />
											</div>
										</div>
									</div>
									</div>

									<div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
									<p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Resumo da inspeção</p>
									<div className="mt-4 space-y-3">
										<div className="rounded-2xl border border-slate-200 bg-white p-4">
											<p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Data</p>
											<p className="mt-1 text-sm font-black text-slate-950">{inspectionDate ? formatDateForDisplay(inspectionDate) : "Pendente"}</p>
										</div>
										<div className="rounded-2xl border border-slate-200 bg-white p-4">
											<p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Responsável</p>
											<p className="mt-1 text-sm font-black text-slate-950">{responsibleName || "Pendente"}</p>
											{responsibleIdentifier && <p className="mt-1 text-xs text-slate-500">{responsibleIdentifier}</p>}
										</div>
										<div className="rounded-2xl border border-slate-200 bg-white p-4">
											<p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Colaboradores</p>
											<p className="mt-1 text-sm font-black text-slate-950">0 selecionado(s)</p>
										</div>
									</div>

									<div className="mt-5 flex flex-col gap-3 sm:flex-row">
										<button type="button" onClick={() => setShowNovaInspecao(false)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:border-slate-300 hover:bg-slate-50">
											Cancelar
										</button>
										<button type="button" onClick={handleCreateInspection} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a5483] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(10,84,131,0.22)] transition hover:bg-[#083d61]">
											Criar inspeção
											<ChevronRight size={16} />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}