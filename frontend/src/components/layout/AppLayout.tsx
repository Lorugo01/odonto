import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav, MobileDrawer, Sidebar } from "./Sidebar";

const titles: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Indicadores do dia e da semana" },
  "/agenda": { title: "Agenda", subtitle: "Consultas da clínica" },
  "/pacientes": { title: "Pacientes", subtitle: "Cadastro e fichas" },
  "/documentos": { title: "Documentos", subtitle: "Receitas e arquivos" },
  "/inicio": { title: "Início", subtitle: "Sua próxima consulta" },
  "/consultas": { title: "Consultas", subtitle: "Histórico e status" },
  "/agendar": { title: "Agendar", subtitle: "Escolha serviço, profissional e horário" },
  "/meus-documentos": { title: "Documentos", subtitle: "Arquivos da clínica" },
};

export function AppLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta =
    titles[location.pathname] ??
    (location.pathname.startsWith("/pacientes/")
      ? { title: "Ficha do paciente", subtitle: "Histórico e documentos" }
      : { title: "Dentista" });

  return (
    <div className="min-h-screen flex bg-neutral">
      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={meta.title} subtitle={meta.subtitle} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-3 sm:p-6 overflow-auto pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
