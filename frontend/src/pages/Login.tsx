import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { Usuario, isStaff } from "../types";
import { btn } from "../utils/buttonStyles";
import { ErrorState, Field, Input } from "../components/ui";
import { ClinicMark } from "../components/brand/ClinicMark";
import { rememberClinicSlug } from "../utils/brand";

export default function Login() {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const publicClinic = useAuthStore((s) => s.publicClinic);
  const clinicName = publicClinic?.name || "Acesse sua clínica";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: Usuario }>("/auth/login", {
        email,
        senha,
      });
      setCredentials(data);
      if (data.user.clinic?.slug) rememberClinicSlug(data.user.clinic.slug);
      navigate(isStaff(data.user) ? "/dashboard" : "/inicio", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <ClinicMark name={clinicName} logoUrl={publicClinic?.logoUrl} size={48} />
          <h1 className="text-2xl font-bold text-ink">{clinicName}</h1>
          <p className="text-sm text-ink-muted">Acesse com suas credenciais</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8"
        >
          <Field label="E-mail">
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="voce@clinica.com"
                autoComplete="email"
                required
              />
            </div>
          </Field>

          <Field label="Senha">
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </Field>

          {error ? <ErrorState message={error} /> : null}

          <button type="submit" disabled={loading} className={`${btn.primaryLg} w-full`}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>

          <Link
            to="/cadastro"
            className="text-center text-sm font-medium text-primary hover:text-primary-hover"
          >
            Sou paciente — criar conta
          </Link>
        </form>
      </div>
    </div>
  );
}
