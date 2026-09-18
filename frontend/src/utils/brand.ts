/** Cor padrão do produto até a clínica definir a própria marca. */
export const DEFAULT_BRAND_COLOR = "#0D9488";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG_KEY = "dentista-clinic-slug";

export type ClinicPublic = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
};

export type ClinicBranding = ClinicPublic & {
  id: string;
  timezone: string;
  legalName: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  documentFooter: string | null;
};

export function normalizeBrandColor(value?: string | null): string {
  const trimmed = (value ?? "").trim();
  if (HEX.test(trimmed)) return trimmed.toUpperCase();
  return DEFAULT_BRAND_COLOR;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function mix(hex: string, other: { r: number; g: number; b: number }, t: number) {
  const a = hexToRgb(hex);
  return rgbToHex(
    Math.round(a.r + (other.r - a.r) * t),
    Math.round(a.g + (other.g - a.g) * t),
    Math.round(a.b + (other.b - a.b) * t),
  );
}

/** Hover mais escuro e fundo suave derivados da cor da clínica. */
export function brandTokens(hex?: string | null) {
  const color = normalizeBrandColor(hex);
  return {
    DEFAULT: color,
    hover: mix(color, { r: 0, g: 0, b: 0 }, 0.18),
    soft: mix(color, { r: 255, g: 255, b: 255 }, 0.86),
  };
}

/** Aplica as variáveis CSS usadas pelo Tailwind (`primary`, `primary-hover`, `primary-soft`). */
export function applyBrandColor(hex?: string | null) {
  if (typeof document === "undefined") return;
  const tokens = brandTokens(hex);
  const root = document.documentElement;
  root.style.setProperty("--brand", tokens.DEFAULT);
  root.style.setProperty("--brand-hover", tokens.hover);
  root.style.setProperty("--brand-soft", tokens.soft);
}

export function rememberClinicSlug(slug: string) {
  const value = slug.trim().toLowerCase();
  if (!value) return;
  localStorage.setItem(SLUG_KEY, value);
}

/** Slug da clínica no login: query, última visita, env, ou demo `sorriso`. */
export function resolveClinicSlug() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = (params.get("clinica") || params.get("slug") || "").trim().toLowerCase();
  if (fromUrl) {
    rememberClinicSlug(fromUrl);
    return fromUrl;
  }
  const stored = (localStorage.getItem(SLUG_KEY) ?? "").trim().toLowerCase();
  if (stored) return stored;
  const env = (import.meta.env.VITE_CLINIC_SLUG ?? "").trim().toLowerCase();
  if (env) return env;
  return "sorriso";
}
