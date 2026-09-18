import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Usuario } from "../types";

/**
 * A chave ganhou sufixo v2 porque `roles` deixou de ser a lista de vínculos e
 * passou a ser a lista de papéis da clínica ativa. Sessões gravadas no formato
 * antigo são ignoradas, evitando avaliar permissão com dados incompatíveis.
 */
const STORAGE_KEY = "dentista-auth-v2";

interface AuthState {
  user: Usuario | null;
  token: string | null;
  setCredentials: (payload: { user: Usuario; token: string }) => void;
  setToken: (token: string) => void;
  setUser: (user: Usuario) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setCredentials: ({ user, token }) => set({ user, token }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    { name: STORAGE_KEY },
  ),
);
