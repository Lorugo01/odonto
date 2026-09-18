import { LogOut, Menu } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { roleLabel } from "../../types";

export function Header({
  title,
  subtitle,
  onMenu,
}: {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const roles = user?.roles ?? [];
  const initials = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="shrink-0 rounded-lg border border-line p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink md:hidden"
          onClick={onMenu}
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-ink sm:text-xl">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-ink-muted sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold text-ink">{user?.name}</div>
          <div className="text-xs text-ink-muted">
            {user?.clinicName}
            {/* Mostra todos os papéis: um admin pode também atender como dentista. */}
            {roles.length > 0 ? ` · ${roles.map((r) => roleLabel[r] ?? r).join(" + ")}` : ""}
          </div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {initials || "?"}
        </span>
        <button
          type="button"
          className="rounded-lg border border-line p-2 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
          onClick={logout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
