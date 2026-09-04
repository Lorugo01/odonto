import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { Usuario, isStaff } from "../types";
import { btn } from "../utils/buttonStyles";

export default function Login() {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const [email, setEmail] = useState("admin@sorriso.com");
  const [senha, setSenha] = useState("senha123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: Usuario }>("/auth/login", { email, senha });
      setCredentials(data);
      navigate(isStaff(data.user.role) ? "/dashboard" : "/inicio", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral p-4">
      <div className="w-full max-w-md bg-neutral/80 border border-white/10 rounded-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center">Dentista</h1>
        <p className="text-white/60 text-center mb-6 text-sm">Acesse com suas credenciais</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm text-white/70">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-neutral/60 px-3 py-2 focus:border-primary focus:outline-none"
              required
            />
          </label>
          <label className="text-sm text-white/70">
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-neutral/60 px-3 py-2 focus:border-primary focus:outline-none"
              required
            />
          </label>
          {error ? <span className="text-danger text-sm">{error}</span> : null}
          <button type="submit" disabled={loading} className={`${btn.primaryLg} w-full`}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <Link to="/cadastro" className="block text-center text-primary text-sm mt-4">
          Sou paciente — criar conta
        </Link>
      </div>
    </div>
  );
}
