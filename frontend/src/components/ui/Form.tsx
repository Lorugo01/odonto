import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from "react";

/** Estilo único de controle de formulário (antes duplicado em cada tela). */
export const controlCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-canvas disabled:text-ink-muted";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${controlCls} ${className}`} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`${controlCls} ${className}`} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", ...props }, ref) {
    return <select ref={ref} className={`${controlCls} ${className}`} {...props} />;
  },
);

/** Par de radios Sim/Não para itens de anamnese. */
export function YesNo({
  value,
  onChange,
  name,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  name?: string;
}) {
  return (
    <div className="flex gap-4 text-sm">
      {[
        { label: "Sim", v: true },
        { label: "Não", v: false },
      ].map((opt) => (
        <label key={opt.label} className="inline-flex cursor-pointer items-center gap-1.5 text-ink">
          <input
            type="radio"
            name={name}
            checked={value === opt.v}
            onChange={() => onChange(opt.v)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
