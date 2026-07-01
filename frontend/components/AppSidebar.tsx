"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Bell, FileText, Folder, History, Map, Maximize, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useInspectionAnalysis } from "./InspectionAnalysisProvider";

type SidebarItem = {
  label: string;
  href: string | null;
  Icon: LucideIcon;
};

type AppSidebarProps = {
  activePath: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { Icon: Folder, label: "Meus trabalhos", href: "/meus-trabalhos" },
  { Icon: Upload, label: "Upload de imagens ", href: "/upload-imagens" },
  { Icon: FileText, label: "Relatório", href: "/relatorio" },
  { Icon: History, label: "Histórico", href: "/historico" }, 
];

export default function AppSidebar({ activePath }: AppSidebarProps) {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead } = useInspectionAnalysis();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications((open) => {
      if (!open) {
        markAllRead();
      }
      return !open;
    });
  };

  return (
    <aside className="w-20 bg-[#1e2235] flex flex-col items-center py-6 shrink-0 min-h-screen border-r border-gray-800">
      {/* Topo / Logo */}
      <div className="p-3 bg-[#165D7A] rounded-xl text-white mb-10">
        <Activity size={26} strokeWidth={2.5} />
      </div>

      {/* Itens de Navegação */}
      <div className="flex flex-col gap-9 items-center w-full mb-auto">
        {SIDEBAR_ITEMS.map(({ Icon, label, href }) => {
          // Verifica se o caminho atual bate exatamente com o link do botão
          const isActive = href ? activePath === href : false;
          const isDisabled = href === null;

          return (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              disabled={isDisabled}
              onClick={() => {
                if (href) {
                  router.push(href);
                }
              }}
              className={`transition-all duration-200 p-2 rounded-xl relative ${
                isActive
                  ? "bg-[#165D7A] text-white shadow-[0_8px_24px_rgba(22,93,122,0.35)]"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5 disabled:cursor-default disabled:opacity-100"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            </button>
          );
        })}
      </div>

      {/* Notificações no Rodapé */}
      <div className="relative pb-4">
        <button
          type="button"
          title="Notificações"
          aria-label="Notificações"
          onClick={toggleNotifications}
          className="relative text-gray-400 hover:text-white transition-colors"
        >
          <Bell size={26} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#1e2235] shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute bottom-0 left-full z-50 ml-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">Notificações</p>
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma notificação por enquanto.</p>
            ) : (
              <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                {notifications.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.variant === "error" ? "bg-red-500" : "bg-emerald-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-600">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}