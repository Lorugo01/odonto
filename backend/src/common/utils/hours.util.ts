/** Expediente padrão: segunda a sexta, 8h às 18h. */
export const DEFAULT_START_MIN = 8 * 60;
export const DEFAULT_END_MIN = 18 * 60;

export type WeekdayHours = {
  weekday: number;
  enabled: boolean;
  startMin: number;
  endMin: number;
};

export function defaultWeekHours(): WeekdayHours[] {
  return Array.from({ length: 7 }).map((_, weekday) => ({
    weekday,
    enabled: weekday >= 1 && weekday <= 5,
    startMin: DEFAULT_START_MIN,
    endMin: DEFAULT_END_MIN,
  }));
}

export function minutesToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Completa os 7 dias; se a clínica ainda não cadastrou, usa o expediente padrão. */
export function mergeWeekHours(rows: WeekdayHours[]): WeekdayHours[] {
  const byDay = new Map(rows.map((r) => [r.weekday, r]));
  if (rows.length === 0) return defaultWeekHours();
  return defaultWeekHours().map((fallback) => byDay.get(fallback.weekday) ?? { ...fallback, enabled: false });
}
