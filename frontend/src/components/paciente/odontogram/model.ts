/**
 * Modelo do odontograma clínico (numeração FDI / ISO 3950).
 * O estado é serializado direto no campo `PatientChart.odontogram` (JSONB).
 */

export const ODONTOGRAM_VERSION = 1;

/** Faces registráveis. Anteriores usam `I` (incisal); posteriores usam `O` (oclusal). */
export const SURFACES = ["O", "I", "M", "D", "V", "L"] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_LABELS: Record<Surface, string> = {
  O: "Oclusal",
  I: "Incisal",
  M: "Mesial",
  D: "Distal",
  V: "Vestibular",
  L: "Lingual/Palatina",
};

export type ToothStatusId =
  | "carie"
  | "restauracao"
  | "canal"
  | "protese"
  | "implante"
  | "selante"
  | "extracao_indicada"
  | "ausente";

export type StatusScope = "surface" | "tooth" | "both";

export type ToothStatus = {
  id: ToothStatusId;
  label: string;
  short: string;
  color: string;
  /** Onde o status pode ser aplicado: face, dente inteiro ou ambos. */
  scope: StatusScope;
};

export const TOOTH_STATUSES: readonly ToothStatus[] = [
  { id: "carie", label: "Cárie", short: "C", color: "#EF4444", scope: "both" },
  { id: "restauracao", label: "Restauração", short: "R", color: "#3B82F6", scope: "both" },
  { id: "selante", label: "Selante", short: "S", color: "#22D3EE", scope: "surface" },
  { id: "canal", label: "Canal", short: "E", color: "#A855F7", scope: "tooth" },
  { id: "protese", label: "Prótese/Coroa", short: "P", color: "#F59E0B", scope: "tooth" },
  { id: "implante", label: "Implante", short: "I", color: "#10B981", scope: "tooth" },
  { id: "extracao_indicada", label: "Extração indicada", short: "X", color: "#FB923C", scope: "tooth" },
  { id: "ausente", label: "Ausente/Extraído", short: "A", color: "#64748B", scope: "tooth" },
] as const;

const STATUS_BY_ID = new Map(TOOTH_STATUSES.map((s) => [s.id, s]));

export function statusById(id?: string | null): ToothStatus | undefined {
  return id ? STATUS_BY_ID.get(id as ToothStatusId) : undefined;
}

export function statusColor(id?: string | null): string {
  return statusById(id)?.color ?? "transparent";
}

export type ToothState = {
  status?: ToothStatusId;
  surfaces?: Partial<Record<Surface, ToothStatusId>>;
  note?: string;
};

export type OdontogramData = {
  version?: number;
  teeth?: Record<string, ToothState>;
};

/** Payload aceito da API: formato atual ou legado (`{"16":"carie"}`). */
export type OdontogramInput = Record<string, unknown> | null | undefined;

export type Dentition = "permanent" | "deciduous";

/** Quadrantes na ordem de exibição (direita do paciente à esquerda). */
export const PERMANENT_QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
} as const;

export const DECIDUOUS_QUADRANTS = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerRight: [85, 84, 83, 82, 81],
  lowerLeft: [71, 72, 73, 74, 75],
} as const;

export function quadrantsFor(dentition: Dentition) {
  return dentition === "permanent" ? PERMANENT_QUADRANTS : DECIDUOUS_QUADRANTS;
}

const ALL_TEETH = new Set<number>([
  ...Object.values(PERMANENT_QUADRANTS).flat(),
  ...Object.values(DECIDUOUS_QUADRANTS).flat(),
]);

export function isValidTooth(n: number): boolean {
  return ALL_TEETH.has(n);
}

export type ToothKind = "incisivo" | "canino" | "premolar" | "molar";

/** Tipo do dente pelo último dígito FDI (decíduos 54/55 são molares). */
export function toothKind(n: number): ToothKind {
  const position = n % 10;
  const isDeciduous = Math.floor(n / 10) >= 5;
  if (position <= 2) return "incisivo";
  if (position === 3) return "canino";
  if (isDeciduous) return "molar";
  return position <= 5 ? "premolar" : "molar";
}

export function isAnterior(n: number): boolean {
  const kind = toothKind(n);
  return kind === "incisivo" || kind === "canino";
}

/** Faces disponíveis: anteriores têm incisal, posteriores têm oclusal. */
export function surfacesFor(n: number): Surface[] {
  return isAnterior(n) ? ["I", "M", "D", "V", "L"] : ["O", "M", "D", "V", "L"];
}

export function isValidSurface(n: number, surface: string): surface is Surface {
  return surfacesFor(n).includes(surface as Surface);
}

/** Dentes do lado direito têm mesial à direita do desenho (espelhamento). */
export function isRightSide(n: number): boolean {
  const quadrant = Math.floor(n / 10);
  return quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8;
}

const NOTE_MAX = 280;

/**
 * Normaliza qualquer payload salvo (atual ou legado) para `OdontogramData`,
 * descartando dentes, status e faces desconhecidos.
 */
export function normalizeChart(input: OdontogramInput): OdontogramData {
  const teeth: Record<string, ToothState> = {};
  if (!input || typeof input !== "object") return { version: ODONTOGRAM_VERSION, teeth };

  const source =
    "teeth" in input && input.teeth && typeof input.teeth === "object"
      ? (input.teeth as Record<string, unknown>)
      : (input as Record<string, unknown>);

  for (const [key, raw] of Object.entries(source)) {
    const tooth = Number(key);
    if (!Number.isInteger(tooth) || !isValidTooth(tooth)) continue;

    const state: ToothState = {};

    // Legado: valor era só o id do status do dente inteiro.
    if (typeof raw === "string") {
      const status = statusById(raw);
      if (status) state.status = status.id;
    } else if (raw && typeof raw === "object") {
      const entry = raw as Record<string, unknown>;
      const status = statusById(typeof entry.status === "string" ? entry.status : null);
      if (status && status.scope !== "surface") state.status = status.id;

      if (entry.surfaces && typeof entry.surfaces === "object") {
        const surfaces: Partial<Record<Surface, ToothStatusId>> = {};
        for (const [face, value] of Object.entries(entry.surfaces as Record<string, unknown>)) {
          if (typeof value !== "string" || !isValidSurface(tooth, face)) continue;
          const faceStatus = statusById(value);
          if (faceStatus && faceStatus.scope !== "tooth") surfaces[face] = faceStatus.id;
        }
        if (Object.keys(surfaces).length > 0) state.surfaces = surfaces;
      }

      if (typeof entry.note === "string" && entry.note.trim()) {
        state.note = entry.note.trim().slice(0, NOTE_MAX);
      }
    }

    if (state.status || state.surfaces || state.note) teeth[String(tooth)] = state;
  }

  return { version: ODONTOGRAM_VERSION, teeth };
}

export function toothState(data: OdontogramData, tooth: number): ToothState {
  return data.teeth?.[String(tooth)] ?? {};
}

export function hasFindings(state: ToothState): boolean {
  return Boolean(state.status || (state.surfaces && Object.keys(state.surfaces).length > 0));
}

/** Quantidade de dentes com algum achado clínico registrado. */
export function countFindings(data: OdontogramData): number {
  return Object.values(data.teeth ?? {}).filter(hasFindings).length;
}

/** Aplica (ou remove, se já for o mesmo status) o status em uma face. */
export function setSurfaceStatus(
  data: OdontogramData,
  tooth: number,
  surface: Surface,
  status: ToothStatusId,
): OdontogramData {
  const current = toothState(data, tooth);
  const surfaces = { ...(current.surfaces ?? {}) };
  if (surfaces[surface] === status) delete surfaces[surface];
  else surfaces[surface] = status;
  return writeTooth(data, tooth, { ...current, surfaces });
}

/** Aplica (ou remove, se já for o mesmo status) o status do dente inteiro. */
export function setToothStatus(
  data: OdontogramData,
  tooth: number,
  status: ToothStatusId,
): OdontogramData {
  const current = toothState(data, tooth);
  const next: ToothState = { ...current, status: current.status === status ? undefined : status };
  return writeTooth(data, tooth, next);
}

export function setToothNote(data: OdontogramData, tooth: number, note: string): OdontogramData {
  const current = toothState(data, tooth);
  const trimmed = note.slice(0, NOTE_MAX);
  return writeTooth(data, tooth, { ...current, note: trimmed || undefined });
}

export function clearTooth(data: OdontogramData, tooth: number): OdontogramData {
  const teeth = { ...(data.teeth ?? {}) };
  delete teeth[String(tooth)];
  return { version: ODONTOGRAM_VERSION, teeth };
}

export function clearAll(): OdontogramData {
  return { version: ODONTOGRAM_VERSION, teeth: {} };
}

function writeTooth(data: OdontogramData, tooth: number, state: ToothState): OdontogramData {
  const teeth = { ...(data.teeth ?? {}) };
  const clean: ToothState = {};
  if (state.status) clean.status = state.status;
  if (state.surfaces && Object.keys(state.surfaces).length > 0) clean.surfaces = state.surfaces;
  if (state.note) clean.note = state.note;

  if (Object.keys(clean).length === 0) delete teeth[String(tooth)];
  else teeth[String(tooth)] = clean;

  return { version: ODONTOGRAM_VERSION, teeth };
}

export const NOTE_MAX_LENGTH = NOTE_MAX;
