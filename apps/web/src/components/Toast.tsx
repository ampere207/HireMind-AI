"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastVariant = "default" | "success" | "destructive" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  toast: (options: { title: string; description?: string; variant?: ToastVariant }) => void;
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, ...options }]);
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      dismiss(id);
    }, 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      {/* Toast container in bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg glass-card border border-white/10 shadow-2xl transition-all duration-300 transform translate-y-0`}
            style={{
              borderColor:
                t.variant === "success"
                  ? "rgba(6, 182, 212, 0.4)"
                  : t.variant === "destructive"
                  ? "rgba(239, 68, 68, 0.4)"
                  : "rgba(168, 85, 247, 0.4)",
            }}
          >
            {t.variant === "success" && <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
            {t.variant === "destructive" && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
            {t.variant === "info" && <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />}
            {(!t.variant || t.variant === "default") && (
              <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <h4 className="text-sm font-semibold text-zinc-100">{t.title}</h4>
              {t.description && <p className="text-xs text-zinc-400 mt-1">{t.description}</p>}
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
