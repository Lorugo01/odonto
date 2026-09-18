/**
 * Só permite links http(s). Evita que uma URL salva como `javascript:...`
 * no cadastro de documentos seja executada ao clicar no link.
 */
export function safeHttpUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
