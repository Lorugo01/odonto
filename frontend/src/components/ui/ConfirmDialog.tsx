import { ReactNode, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { btn } from "../../utils/buttonStyles";

/**
 * Confirmação bloqueante para ações destrutivas ou irreversíveis
 * (cancelar consulta, limpar odontograma, assinar evolução).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm animate-fade-in rounded-xl border border-line bg-surface p-5 shadow-pop"
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
            }`}
          >
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={btn.secondary} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? btn.danger : btn.primary}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
