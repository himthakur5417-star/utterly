"use client";

import * as React from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, size = "md", footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} />
      <div className={`relative z-10 w-full ${widths[size]} bg-white rounded-2xl border border-ink-100 shadow-pop my-8 animate-fade-up`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-ink-100">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-ink-100 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
