import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RoleRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { BrandTheme } from "./components/brand/BrandTheme";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import { DefaultRedirect } from "./pages/DefaultRedirect";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Pacientes from "./pages/Pacientes";
import PacienteDetalhe from "./pages/PacienteDetalhe";
import Documentos from "./pages/Documentos";
import DocumentoImpressao from "./pages/DocumentoImpressao";
import Tratamentos from "./pages/Tratamentos";
import Equipe from "./pages/Equipe";
import Configuracoes from "./pages/Configuracoes";
import InicioPaciente from "./pages/InicioPaciente";
import Consultas from "./pages/Consultas";
import Agendar from "./pages/Agendar";
import MeusDocumentos from "./pages/MeusDocumentos";

export default function App() {
  return (
    <>
      <BrandTheme />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route element={<ProtectedRoute />}>
        {/* Fora do AppLayout: a folha de impressão não leva menu nem cabeçalho */}
        <Route path="/documentos/:id/imprimir" element={<DocumentoImpressao />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/pacientes/:id" element={<PacienteDetalhe />} />
          <Route path="/documentos" element={<Documentos />} />

          {/* Catálogo, tratamentos e permissões */}
          <Route element={<RoleRoute allow={["CLINIC_ADMIN"]} />}>
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          <Route element={<RoleRoute allow={["CLINIC_ADMIN", "DENTIST"]} />}>
            <Route path="/tratamentos" element={<Tratamentos />} />
          </Route>
          <Route path="/servicos" element={<Navigate to="/tratamentos" replace />} />

          <Route path="/inicio" element={<InicioPaciente />} />
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/meus-documentos" element={<MeusDocumentos />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
