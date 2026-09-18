/**
 * Utilitários de data no fuso local.
 *
 * `toISOString().slice(0, 10)` devolve a data em UTC, o que no Brasil (UTC-3)
 * aponta para o dia seguinte no fim da noite. Estas funções evitam esse desvio.
 */

/** Data local no formato `YYYY-MM-DD` (aceito pelo input[type=date] e pela API). */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Chave de agrupamento por dia local a partir de um ISO vindo da API. */
export function localDateKey(iso: string): string {
  return toLocalISODate(new Date(iso));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
