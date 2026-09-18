const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed";

const size = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
};

const color = {
  primary: "bg-primary hover:bg-primary-hover text-white shadow-card",
  secondary: "bg-surface hover:bg-canvas text-ink border border-line shadow-card",
  ghost: "text-ink-muted hover:bg-canvas hover:text-ink",
  danger: "bg-danger-soft hover:bg-danger/20 text-danger border border-danger/30",
  success: "bg-success-soft hover:bg-success/20 text-success border border-success/30",
};

export const btn = {
  primary: `${base} ${size.md} ${color.primary}`,
  secondary: `${base} ${size.md} ${color.secondary}`,
  ghost: `${base} ${size.md} ${color.ghost}`,
  danger: `${base} ${size.md} ${color.danger}`,
  success: `${base} ${size.md} ${color.success}`,
  primarySm: `${base} ${size.sm} ${color.primary}`,
  secondarySm: `${base} ${size.sm} ${color.secondary}`,
  ghostSm: `${base} ${size.sm} ${color.ghost}`,
  dangerSm: `${base} ${size.sm} ${color.danger}`,
  successSm: `${base} ${size.sm} ${color.success}`,
  primaryLg: `${base} ${size.lg} ${color.primary}`,
  secondaryLg: `${base} ${size.lg} ${color.secondary}`,
};
