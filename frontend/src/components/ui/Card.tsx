import { ReactNode } from "react";

/** Painel padrão da aplicação. Substitui o antigo `bg-white/5 border border-white/10`. */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-card ${padded ? "p-4 sm:p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Cabeçalho do card: título à esquerda, ações à direita. */
export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** KPI numérico usado no dashboard. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
  tone?: "primary" | "warning" | "success";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
  };
  return (
    <Card className="flex items-center gap-4">
      {icon ? (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</div>
        <div className="text-2xl font-bold leading-tight text-ink">{value}</div>
        {hint ? <div className="text-xs text-ink-soft">{hint}</div> : null}
      </div>
    </Card>
  );
}
