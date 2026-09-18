import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

type Toast = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DURATION_MS = 4000;

const styles: Record<ToastKind, { cls: string; icon: ReactNode }> = {
  success: {
    cls: "border-success/30 bg-success-soft text-success",
    icon: <CheckCircle2 size={18} />,
  },
  error: { cls: "border-danger/30 bg-danger-soft text-danger", icon: <AlertCircle size={18} /> },
  info: { cls: "border-line bg-surface text-ink", icon: <Info size={18} /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  // Guarda os timers para limpar no unmount e evitar setState em componente morto.
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      if (!message) return;
      const id = ++seq.current;
      setItems((list) => [...list, { id, kind, message }]);
      timers.current.push(window.setTimeout(() => dismiss(id), DURATION_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:left-auto sm:right-4 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-pop ${styles[t.kind].cls}`}
          >
            <span className="mt-0.5 shrink-0">{styles[t.kind].icon}</span>
            <span className="min-w-0 flex-1 break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Fechar aviso"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}
