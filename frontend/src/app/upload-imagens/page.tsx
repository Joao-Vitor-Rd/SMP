"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Folder,
  History,
  LogOut,
  Map,
  Maximize,
  Settings,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { clearAuthSession } from "../../lib/authApi";

type QueueStatus = "pending" | "uploading" | "completed" | "rejected";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: QueueStatus;
  progress: number;
  message: string;
};

type UserState = {
  nome: string;
  cargo: string;
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/tiff", "image/x-tiff"];
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "tif", "tiff"];

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

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const size = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** size).toFixed(size === 0 ? 0 : 1)} ${units[size]}`;
}

function createId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function getFileKindLabel(file: File) {
  const extension = getFileExtension(file);
  if (extension === "jpg" || extension === "jpeg") return "JPG";
  if (extension === "png") return "PNG";
  if (extension === "tif" || extension === "tiff") return "TIFF";
  return extension.toUpperCase() || "ARQUIVO";
}

function validateFile(file: File) {
  const extension = getFileExtension(file);
  const isValidType = ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase()) || ACCEPTED_EXTENSIONS.includes(extension);

  if (!isValidType) {
    return "Formato inválido. O sistema aceita apenas JPG, PNG e TIFF.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Arquivo maior que 50 MB. Selecione uma versão menor antes de enviar.";
  }

  return null;
}

function isSameFile(a: File, b: File) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

export default function UploadImagensPage() {
  const router = useRouter();
  const pathname = usePathname(); // Captura a rota atual com precisão
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showPopUp, setShowPopUp] = useState(false);
  const [initialUserState] = useState<UserState>(() => getInitialUserState());
  const [usuarioNome] = useState(initialUserState.nome);
  const [cargoUsuario] = useState(initialUserState.cargo);
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);

  const totalSelectedSize = useMemo(() => items.reduce((sum, item) => sum + item.file.size, 0), [items]);

  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [items]);

  function cleanupItem(item: UploadItem) {
    URL.revokeObjectURL(item.previewUrl);
  }

  function clearQueue() {
    setItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);

    if (!incoming.length) {
      return;
    }

    const nextItems: UploadItem[] = [];

    incoming.forEach((file) => {
      const validationError = validateFile(file);
      const duplicate = items.some((item) => isSameFile(item.file, file)) || nextItems.some((item) => isSameFile(item.file, file));

      if (validationError) {
        nextItems.push({
          id: createId(file),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "rejected",
          progress: 0,
          message: validationError,
        });
        return;
      }

      if (duplicate) {
        nextItems.push({
          id: createId(file),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "rejected",
          progress: 0,
          message: "Arquivo duplicado já está na fila.",
        });
        return;
      }

      nextItems.push({
        id: createId(file),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
        message: "Aguardando envio",
      });
    });

    setItems((current) => [...current, ...nextItems]);
  }

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Sidebar */}
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
            const isActive = pathname === href;

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

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-4 hover:bg-red-50 text-sm text-red-600 transition-colors group border-t border-gray-100"
                >
                  <LogOut size={16} />
                  <span className="font-bold">Sair</span>
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
              <Upload size={20} className="text-gray-600" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Upload de Imagens</h2>
                <p className="text-xs text-gray-500 font-medium italic mt-0.5">Inspeção e georreferenciamento de vias</p>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${isDragging ? 'border-[#0a5483] bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white border border-gray-200 text-[#0a5483] shadow-sm">
                <Upload size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Arraste as imagens da via aqui</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-2xl mx-auto">
                Formatos aceitos: JPG, PNG e TIFF. Também é possível selecionar múltiplos arquivos de uma vez. Cada imagem precisa ter até 50 MB.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  inputRef.current?.click();
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0a5483] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083d61]"
              >
                Selecionar arquivos
                <ChevronRight size={16} />
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff"
              aria-label="Selecionar imagens para upload"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Fila de Upload</h3>
                  <p className="text-sm text-gray-500 mt-1">{items.length} arquivo(s) na fila • {formatBytes(totalSelectedSize)} total</p>
                </div>
                <button
                  type="button"
                  onClick={clearQueue}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100"
                >
                  Limpar fila
                </button>
              </div>

              <div className="p-4">
                {!items.length ? (
                  <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                    Nenhum arquivo selecionado ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const isUploading = item.status === 'uploading';
                      const isCompleted = item.status === 'completed';
                      const isRejected = item.status === 'rejected';
                      const progressWidth = isCompleted ? 'w-full' : isUploading ? 'w-3/4' : isRejected ? 'w-full' : 'w-0';

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${isRejected ? 'border-red-200 bg-red-50' : isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-start gap-3 sm:flex-1">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${isRejected ? 'border-red-200 bg-white' : 'border-gray-200 bg-gray-100'}`}>
                              {item.previewUrl ? (
                                <Image src={item.previewUrl} alt={item.file.name} width={48} height={48} unoptimized className="h-full w-full object-cover" />
                              ) : (
                                <Upload size={18} className="text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-bold text-gray-900">{item.file.name}</p>
                                <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.2em] ${isRejected ? 'border-red-200 bg-white text-red-600' : isCompleted ? 'border-emerald-200 bg-white text-emerald-700' : isUploading ? 'border-blue-200 bg-white text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                                  {isRejected ? 'Rejeitado' : isCompleted ? 'Concluído' : isUploading ? 'Enviando' : "Na fila"}
                                </span>
                              </div>

                              <p className={`mt-1 text-xs ${isRejected ? 'text-red-600' : 'text-gray-500'}`}>
                                {isRejected ? item.message : `${getFileKindLabel(item.file)} • ${formatBytes(item.file.size)}`}
                              </p>

                              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div className={`h-full rounded-full transition-all ${isRejected ? 'bg-red-400 w-full' : isCompleted ? 'bg-emerald-500 w-full' : 'bg-[#0a5483] ' + progressWidth}`} />
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                {isUploading ? <Upload size={13} className="text-blue-600" /> : isCompleted ? <CheckCircle2 size={13} className="text-emerald-600" /> : isRejected ? <CheckCircle2 size={13} className="text-red-600" /> : <CheckCircle2 size={13} className="text-gray-400" />}
                                <span>{item.message}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 sm:w-auto">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.status === 'uploading') {
                                  return;
                                }

                                setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
                                cleanupItem(item);
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remover ${item.file.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}