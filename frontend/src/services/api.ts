import axios from "axios";
import { useAuthStore } from "../store/auth";

const raw = import.meta.env.VITE_API_URL != null ? String(import.meta.env.VITE_API_URL).trim() : "";
const baseURL = raw === "" || raw === "/api" ? "/api" : raw;

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const clinicId = useAuthStore.getState().user?.clinicId;
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  if (clinicId && config.headers) config.headers["x-clinic-id"] = clinicId;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url ?? "");
    const isAuth = url.includes("/auth/login") || url.includes("/auth/register");
    const message =
      error.response?.data?.message ?? error.message ?? "Erro inesperado";
    error.message = Array.isArray(message) ? message.join(" ") : message;
    if (error.response?.status === 401 && !isAuth) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") window.location.replace("/login");
    }
    return Promise.reject(error);
  },
);
