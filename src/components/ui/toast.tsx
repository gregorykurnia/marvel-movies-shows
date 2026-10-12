"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

// DESIGN_GUIDE §7. Ink background, paper text, yellow offset shadow.
// Bottom right on desktop, bottom centre on phones. Auto-dismisses after 4 seconds.
const TOAST_MS = 4000;

type ToastEntry = { id: number; message: ReactNode };

const ToastContext = createContext<((message: ReactNode) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const lastId = useRef(0);

  const show = useCallback((message: ReactNode) => {
    lastId.current += 1;
    const id = lastId.current;
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id}>{toast.message}</ToastView>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Call from a client component: const toast = useToast(); toast("Saved");
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return show;
}

// The presentational toast. Also used directly in the styleguide.
export function ToastView({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-[420px] items-center gap-3 rounded-panel bg-ink px-4 py-3 font-body text-sm font-semibold text-paper shadow-[4px_4px_0_var(--yellow)] [animation:toast-in_var(--dur)_var(--ease)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
