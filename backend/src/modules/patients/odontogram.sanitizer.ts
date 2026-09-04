/**
 * Sanitização do odontograma recebido do cliente.
 * O campo é JSONB livre no banco, então tudo que vem de fora é filtrado aqui
 * contra listas fechadas de dentes, status e faces antes de persistir.
 */

const TOOTH_STATUSES = [
  "carie",
  "restauracao",
  "canal",
  "protese",
  "implante",
  "selante",
  "extracao_indicada",
  "ausente",
] as const;

type ToothStatus = (typeof TOOTH_STATUSES)[number];

/** Status que não fazem sentido por face (dente inteiro). */
const TOOTH_ONLY: ReadonlySet<string> = new Set([
  "canal",
  "protese",
  "implante",
  "extracao_indicada",
  "ausente",
]);

/** Status que não fazem sentido no dente inteiro (apenas por face). */
const SURFACE_ONLY: ReadonlySet<string> = new Set(["selante"]);

const PERMANENT = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

const DECIDUOUS = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const VALID_TEETH: ReadonlySet<number> = new Set([...PERMANENT, ...DECIDUOUS]);

const NOTE_MAX = 280;
const ODONTOGRAM_VERSION = 1;

export type SanitizedToothState = {
  status?: ToothStatus;
  surfaces?: Record<string, ToothStatus>;
  note?: string;
};

export type SanitizedOdontogram = {
  version: number;
  teeth: Record<string, SanitizedToothState>;
};

function isStatus(value: unknown): value is ToothStatus {
  return typeof value === "string" && (TOOTH_STATUSES as readonly string[]).includes(value);
}

/** Anteriores (dígito 1-3) usam incisal; posteriores usam oclusal. */
function allowedSurfaces(tooth: number): ReadonlySet<string> {
  const position = tooth % 10;
  const central = position <= 3 ? "I" : "O";
  return new Set([central, "M", "D", "V", "L"]);
}

/**
 * Converte qualquer payload (formato atual ou legado `{"16":"carie"}`) em um
 * objeto validado. Entradas desconhecidas são descartadas silenciosamente.
 */
export function sanitizeOdontogram(input: unknown): SanitizedOdontogram {
  const teeth: Record<string, SanitizedToothState> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { version: ODONTOGRAM_VERSION, teeth };
  }

  const record = input as Record<string, unknown>;
  const source =
    record.teeth && typeof record.teeth === "object" && !Array.isArray(record.teeth)
      ? (record.teeth as Record<string, unknown>)
      : record;

  for (const [key, raw] of Object.entries(source)) {
    const tooth = Number(key);
    if (!Number.isInteger(tooth) || !VALID_TEETH.has(tooth)) continue;

    const state: SanitizedToothState = {};

    if (isStatus(raw)) {
      // Formato legado: valor era o próprio status do dente.
      if (!SURFACE_ONLY.has(raw)) state.status = raw;
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const entry = raw as Record<string, unknown>;

      if (isStatus(entry.status) && !SURFACE_ONLY.has(entry.status)) {
        state.status = entry.status;
      }

      if (entry.surfaces && typeof entry.surfaces === "object" && !Array.isArray(entry.surfaces)) {
        const allowed = allowedSurfaces(tooth);
        const surfaces: Record<string, ToothStatus> = {};
        for (const [face, value] of Object.entries(entry.surfaces as Record<string, unknown>)) {
          if (!allowed.has(face) || !isStatus(value) || TOOTH_ONLY.has(value)) continue;
          surfaces[face] = value;
        }
        if (Object.keys(surfaces).length > 0) state.surfaces = surfaces;
      }

      if (typeof entry.note === "string") {
        const note = entry.note.trim().slice(0, NOTE_MAX);
        if (note) state.note = note;
      }
    }

    if (state.status || state.surfaces || state.note) teeth[String(tooth)] = state;
  }

  return { version: ODONTOGRAM_VERSION, teeth };
}
