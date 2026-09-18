import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav, MobileDrawer, Sidebar } from "./Sidebar";
import { useAuthStore } from "../../store/auth";

const titles: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Indicadores do dia e da semana" },
  "/agenda": { title: "Agenda", subtitle: "Consultas da clínica" },
  "/pacientes": { title: "Pacientes", subtitle: "Cadastro e fichas" },
  "/documentos": { title: "Documentos", subtitle: "Receitas e arquivos" },
  "/tratamentos": { title: "Tratamentos", subtitle: "Catálogo da clínica e o que cada dentista atende" },
  "/equipe": { title: "Equipe", subtitle: "Acessos e permissões por usuário" },
  "/configuracoes": { title: "Clínica", subtitle: "Logo, cores e dados do timbre" },
  "/inicio": { title: "Início", subtitle: "Sua próxima consulta" },
  "/consultas": { title: "Consultas", subtitle: "Histórico e status" },
  "/agendar": { title: "Solicitar consulta", subtitle: "Escolha o profissional e o tratamento" },
  "/meus-documentos": { title: "Documentos", subtitle: "Arquivos da clínica" },
};

export function AppLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const clinicName = useAuthStore((s) => s.user?.clinicName);
  const meta =
    titles[location.pathname] ??
    (location.pathname.startsWith("/pacientes/")
      ? { title: "Ficha do paciente", subtitle: "Histórico e documentos" }
      : { title: clinicName || "Clínica" });

  useEffect(() => {
    const clinic = clinicName || "Clínica";
    document.title = `${meta.title} · ${clinic}`;
  }, [meta.title, clinicName]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={meta.title} subtitle={meta.subtitle} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-auto p-3 pb-24 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
