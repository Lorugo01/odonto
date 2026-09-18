const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: number | null | undefined): string {
  return brl.format((cents ?? 0) / 100);
}

/**
 * Converte o texto digitado em centavos. Aceita "120", "120,50" e "1.200,50",
 * devolvendo `null` quando o valor não é um número válido.
 */
export function parseCents(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

/** Valor em centavos no formato editável pelo usuário (sem símbolo). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
