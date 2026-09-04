import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { isStaff } from "../../types";

export const clinicLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/agenda", label: "Agenda" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/documentos", label: "Documentos" },
];

export const patientLinks = [
  { to: "/inicio", label: "Início" },
  { to: "/consultas", label: "Consultas" },
  { to: "/agendar", label: "Agendar" },
  { to: "/meus-documentos", label: "Documentos" },
];

export function useNavLinks() {
  const user = useAuthStore((s) => s.user);
  return user && isStaff(user.role) ? clinicLinks : patientLinks;
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
            `rounded-md px-3 py-2 text-sm ${isActive ? "bg-primary/20 text-primary" : "text-white/70 hover:bg-white/10"}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-white/10 bg-neutral/90 p-4 hidden md:flex md:flex-col">
      <div className="text-primary font-bold tracking-wide mb-6">DENTISTA</div>
      <nav className="flex flex-col gap-1">
        <NavItems />
      </nav>
    </aside>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-40">
      <button className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={onClose} />
      <aside className="relative h-full w-64 max-w-[85vw] bg-neutral border-r border-white/10 p-4 flex flex-col">
        <div className="text-primary font-bold tracking-wide mb-6">DENTISTA</div>
        <nav className="flex flex-col gap-1">
          <NavItems onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}

export function BottomNav() {
  const links = useNavLinks();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-neutral/95 backdrop-blur px-2 py-2 grid grid-cols-4 gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `text-center rounded-md px-1 py-2 text-[11px] leading-tight ${isActive ? "bg-primary/20 text-primary" : "text-white/60"}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
