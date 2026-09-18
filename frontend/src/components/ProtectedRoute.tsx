import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { Role, hasRole } from "../types";

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/**
 * Restringe um grupo de rotas aos papéis informados. Serve de defesa em
 * profundidade: o backend também valida, mas evita telas vazias e confusas.
 */
export function RoleRoute({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRole(user, ...allow)) return <Navigate to="/" replace />;
  return <Outlet />;
}
