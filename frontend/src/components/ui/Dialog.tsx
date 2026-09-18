import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

/**
 * Modal genérico. Escape e clique no fundo fecham, sem o tom de alerta
 * do ConfirmDialog.
 */
export function Dialog({
  open,
  title,
  subtitle,
  icon,
  children,
  footer,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden animate-fade-in rounded-xl border border-line bg-surface shadow-pop ${
          wide ? "max-w-2xl" : "max-w-sm"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 pb-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
            <div className="min-w-0">
              <h2 className="font-semibold text-ink">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5">{children}</div>
        {footer ? (
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line p-5 pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
