import React from "react";

interface SuccessPopupProps {
    message: string;
    onClose: () => void;
}

export default function SuccessPopup({ message, onClose }: SuccessPopupProps) {
    return (
        <div className="fixed top-8 left-1/2 z-50 -translate-x-1/2 bg-[#E6FFF0] border border-[#B7F5D8] rounded-2xl shadow-lg flex items-center px-8 py-6 min-w-[340px] max-w-[90vw]">
            <div className="flex items-center mr-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="#22C55E" />
                    <path d="M8 12.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <span className="font-bold text-[1.5rem] leading-8 text-[#15803D]" style={{ fontFamily: 'Inter, sans-serif' }}>{message}</span>
            <button
                onClick={onClose}
                className="ml-auto flex items-center justify-center w-8 h-8 rounded-full border border-[#B7F5D8] hover:bg-[#D1FADF] transition-colors"
                aria-label="Fechar popup"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="#E6FFF0" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
}
