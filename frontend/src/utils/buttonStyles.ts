const base =
  "inline-flex items-center justify-center rounded-md font-semibold transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
const size = { sm: "px-2.5 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-2.5 text-sm" };
const color = {
  primary: "bg-primary hover:bg-primary/80 text-white",
  secondary: "bg-white/10 hover:bg-white/20 text-white",
  danger: "bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30",
  success: "bg-success/20 hover:bg-success/30 text-success border border-success/30",
};

export const btn = {
  primary: `${base} ${size.md} ${color.primary}`,
  secondary: `${base} ${size.md} ${color.secondary}`,
  danger: `${base} ${size.md} ${color.danger}`,
  success: `${base} ${size.md} ${color.success}`,
  primarySm: `${base} ${size.sm} ${color.primary}`,
  dangerSm: `${base} ${size.sm} ${color.danger}`,
  successSm: `${base} ${size.sm} ${color.success}`,
  primaryLg: `${base} ${size.lg} ${color.primary}`,
};
