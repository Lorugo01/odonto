import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { isStaff } from "../types";

export function DefaultRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isStaff(user.role) ? "/dashboard" : "/inicio"} replace />;
}
