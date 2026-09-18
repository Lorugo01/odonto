import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Usuario } from "../types";
import { ClinicPublic } from "../utils/brand";

/**
 * A chave ganhou sufixo v2 porque `roles` deixou de ser a lista de vínculos e
 * passou a ser a lista de papéis da clínica ativa. Sessões gravadas no formato
 * antigo são ignoradas, evitando avaliar permissão com dados incompatíveis.
 */
const STORAGE_KEY = "dentista-auth-v2";

interface AuthState {
  user: Usuario | null;
  token: string | null;
  /** Marca pública usada no login, antes de existir sessão. */
  publicClinic: ClinicPublic | null;
  setCredentials: (payload: { user: Usuario; token: string }) => void;
  setToken: (token: string) => void;
  setUser: (user: Usuario) => void;
  setPublicClinic: (clinic: ClinicPublic | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      publicClinic: null,
      setCredentials: ({ user, token }) => set({ user, token }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setPublicClinic: (publicClinic) => set({ publicClinic }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        publicClinic: state.publicClinic,
      }),
    },
  ),
);
