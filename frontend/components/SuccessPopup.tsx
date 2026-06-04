import React from "react";
import { CheckCircle2, X } from "lucide-react";

interface SuccessPopupProps {
    message: string;
    onClose: () => void;
}

export default function SuccessPopup({ message, onClose }: SuccessPopupProps) {
    return (
        <div className="fixed top-6 left-1/2 z-50 flex min-h-[76px] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 items-center gap-5 rounded-lg border border-[#B7F5D8] bg-[#F0FFF6] px-6 py-5 shadow-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-[#008A2E]">
                <CheckCircle2 size={28} strokeWidth={2.4} aria-hidden />
            </div>
            <span
                className="min-w-0 flex-1 text-[16px] font-bold leading-5 text-[#008A2E]"
                style={{ fontFamily: "Inter, sans-serif" }}
            >
                {message}
            </span>
            <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#008A2E] transition-colors hover:bg-[#D8F8E5]"
                aria-label="Fechar popup"
            >
                <X size={18} strokeWidth={2.2} aria-hidden />
            </button>
        </div>
    );
}
