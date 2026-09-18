import { ReactNode } from "react";
import { statusLabel } from "../../types";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-ink-muted border-line",
  primary: "bg-primary-soft text-primary border-primary/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Cor por status de consulta, para não repetir o mapa em cada tela. */
const appointmentTones: Record<string, BadgeTone> = {
  REQUESTED: "warning",
  SCHEDULED: "primary",
  CONFIRMED: "success",
  CANCELLED: "neutral",
  COMPLETED: "primary",
  NO_SHOW: "danger",
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <Badge tone={appointmentTones[status] ?? "neutral"} className={className}>
      {statusLabel[status] ?? status}
    </Badge>
  );
}
