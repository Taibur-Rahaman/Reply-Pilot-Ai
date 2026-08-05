"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Toast notifications.
 *
 * Replaces the old pattern of writing `setStatus("Saved")` into a muted <p>,
 * which was silent to screen readers and easy to miss on a phone. The region
 * is a live region, so every confirmation is announced.
 */

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  /** Green confirmation — use after a save the user initiated. */
  success: (message: string) => void;
  /** Red. Pass copy from friendly-errors, never a raw server string. */
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_AFTER_MS = 4000;

const ICON: Record<ToastTone, string> = {
  success: "✅",
  error: "❗",
  info: "ℹ️",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone) => {
    // Date.now() collides when two toasts fire in the same millisecond, which
    // duplicate React keys would then warn about; a counter avoids it.
    setToasts((current) => [
      ...current,
      { id: nextId(), message, tone },
    ]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="rp-toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDone={() =>
              setToasts((current) => current.filter((t) => t.id !== toast.id))
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

let counter = 0;
function nextId() {
  counter += 1;
  return counter;
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const toneClass =
    toast.tone === "success"
      ? "rp-toast--success"
      : toast.tone === "error"
        ? "rp-toast--danger"
        : "";

  return (
    <div className={`rp-toast ${toneClass}`}>
      <span aria-hidden="true">{ICON[toast.tone]}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
