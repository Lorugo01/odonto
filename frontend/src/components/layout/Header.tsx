import { btn } from "../../utils/buttonStyles";
import { useAuthStore } from "../../store/auth";

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
  return (
    <header className="border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          className={`${btn.secondary} md:hidden shrink-0 px-3`}
          onClick={onMenu}
          aria-label="Abrir menu"
        >
          Menu
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">{title}</h1>
          {subtitle ? <p className="text-white/50 text-xs sm:text-sm truncate">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold">{user?.name}</div>
          <div className="text-xs text-white/50">{user?.clinicName}</div>
        </div>
        <button className={btn.secondary} onClick={logout}>
          Sair
        </button>
      </div>
    </header>
  );
}
