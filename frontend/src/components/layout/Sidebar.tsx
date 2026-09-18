import { ReactNode, useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  FileText,
  Home,
  LayoutDashboard,
  Stethoscope,
  Tags,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { canManageCatalog, canManageTreatments, isStaff } from "../../types";

type NavLinkItem = { to: string; label: string; icon: ReactNode };

const iconProps = { size: 18, strokeWidth: 2 } as const;

export const patientLinks: NavLinkItem[] = [
  { to: "/inicio", label: "Início", icon: <Home {...iconProps} /> },
  { to: "/consultas", label: "Consultas", icon: <CalendarDays {...iconProps} /> },
  { to: "/agendar", label: "Solicitar", icon: <CalendarPlus {...iconProps} /> },
  { to: "/meus-documentos", label: "Documentos", icon: <FileText {...iconProps} /> },
];

/**
 * O menu é montado a partir dos papéis acumulados: quem é administrador e
 * dentista ao mesmo tempo vê os itens dos dois perfis.
 */
export function useNavLinks() {
  const user = useAuthStore((s) => s.user);
  return useMemo<NavLinkItem[]>(() => {
    if (!user || !isStaff(user)) return patientLinks;
    const links: NavLinkItem[] = [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard {...iconProps} /> },
      { to: "/agenda", label: "Agenda", icon: <CalendarDays {...iconProps} /> },
      { to: "/pacientes", label: "Pacientes", icon: <Users {...iconProps} /> },
      { to: "/documentos", label: "Documentos", icon: <FileText {...iconProps} /> },
    ];
    if (canManageTreatments(user)) {
      links.push({ to: "/tratamentos", label: "Tratamentos", icon: <Stethoscope {...iconProps} /> });
    }
    if (canManageCatalog(user)) {
      links.push(
        { to: "/servicos", label: "Serviços", icon: <Tags {...iconProps} /> },
        { to: "/equipe", label: "Equipe", icon: <UserCog {...iconProps} /> },
      );
    }
    return links;
  }, [user]);
}

function Brand() {
  return (
    <div className="mb-6 flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white">
        <Stethoscope size={18} />
      </span>
      <span className="font-bold tracking-tight text-ink">Dentista</span>
    </div>
  );
}

export function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const links = useNavLinks();
  return (
    <>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary-soft text-primary"
                : "text-ink-muted hover:bg-canvas hover:text-ink"
            }`
          }
        >
          {l.icon}
          {l.label}
        </NavLink>
      ))}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface p-4 md:flex md:flex-col">
      <Brand />
      <nav className="flex flex-col gap-1">
        <NavItems />
      </nav>
    </aside>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button className="absolute inset-0 bg-ink/40" aria-label="Fechar menu" onClick={onClose} />
      <aside className="relative flex h-full w-64 max-w-[85vw] flex-col border-r border-line bg-surface p-4 shadow-pop">
        <div className="flex items-start justify-between">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          <NavItems onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}

export function BottomNav() {
  const links = useNavLinks();
  // No celular só cabem 4 atalhos; o restante fica no menu lateral.
  const primary = links.slice(0, 4);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-line bg-surface/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      {primary.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] leading-tight transition-colors ${
              isActive ? "bg-primary-soft text-primary" : "text-ink-muted"
            }`
          }
        >
          {l.icon}
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
