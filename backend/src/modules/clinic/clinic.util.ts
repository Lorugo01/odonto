import { Prisma } from "@prisma/client";

/** Cor padrão do produto, usada até a clínica definir a própria marca. */
export const DEFAULT_BRAND_COLOR = "#0D9488";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const LOGO_DATA = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
const MAX_LOGO_CHARS = 350_000;

export type ClinicBrandRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  legalName: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryColor: string;
  documentFooter: string | null;
};

type RawDb = {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
};

let brandingColumnsReady: boolean | null = null;

export async function clinicHasBrandingColumns(db: RawDb) {
  if (brandingColumnsReady !== null) return brandingColumnsReady;
  try {
    const rows = await db.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Clinic'
        AND column_name = 'primaryColor'
      LIMIT 1
    `);
    brandingColumnsReady = rows.length > 0;
  } catch {
    brandingColumnsReady = false;
  }
  return brandingColumnsReady;
}

export function normalizeBrandColor(value?: string | null): string {
  const trimmed = (value ?? "").trim();
  if (HEX.test(trimmed)) return trimmed.toUpperCase();
  return DEFAULT_BRAND_COLOR;
}

export function isSafeLogoUrl(value?: string | null): boolean {
  if (!value) return true;
  const url = value.trim();
  if (url.length > MAX_LOGO_CHARS) return false;
  if (LOGO_DATA.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function publicClinicDto(clinic: {
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}) {
  return {
    name: clinic.name,
    slug: clinic.slug,
    logoUrl: clinic.logoUrl ?? null,
    primaryColor: normalizeBrandColor(clinic.primaryColor),
  };
}

export function clinicSettingsDto(clinic: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  legalName?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  documentFooter?: string | null;
}): ClinicBrandRow {
  return {
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    timezone: clinic.timezone,
    legalName: clinic.legalName ?? null,
    cnpj: clinic.cnpj ?? null,
    phone: clinic.phone ?? null,
    email: clinic.email ?? null,
    address: clinic.address ?? null,
    website: clinic.website ?? null,
    logoUrl: clinic.logoUrl ?? null,
    primaryColor: normalizeBrandColor(clinic.primaryColor),
    documentFooter: clinic.documentFooter ?? null,
  };
}

/** Lê a identidade mesmo se o Prisma Client ainda não foi regenerado. */
export async function loadClinicBranding(db: RawDb, where: { id: string } | { slug: string }) {
  if (!(await clinicHasBrandingColumns(db))) return null;
  const rows =
    "id" in where
      ? await db.$queryRaw<ClinicBrandRow[]>(Prisma.sql`
          SELECT id, name, slug, timezone,
                 "legalName", cnpj, phone, email, address, website,
                 "logoUrl", "primaryColor", "documentFooter"
          FROM "Clinic"
          WHERE id = ${where.id}
          LIMIT 1
        `)
      : await db.$queryRaw<ClinicBrandRow[]>(Prisma.sql`
          SELECT id, name, slug, timezone,
                 "legalName", cnpj, phone, email, address, website,
                 "logoUrl", "primaryColor", "documentFooter"
          FROM "Clinic"
          WHERE slug = ${where.slug} AND status = 'ACTIVE'
          LIMIT 1
        `);
  const row = rows[0];
  return row ? clinicSettingsDto(row) : null;
}
