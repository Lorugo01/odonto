import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { Usuario } from "../types";
import { btn } from "../utils/buttonStyles";
import { ErrorState, Field, Input } from "../components/ui";

export default function Cadastro() {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ token: string; user: Usuario }>("/auth/register-patient", {
        name,
        email,
        senha,
        clinicSlug: "sorriso",
        consent: true,
      });
      setCredentials(data);
      navigate("/inicio", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-white shadow-card">
            <UserPlus size={24} />
          </span>
          <h1 className="text-2xl font-bold text-ink">Cadastro do paciente</h1>
          <p className="text-center text-sm text-ink-muted">
            Ao continuar você aceita o termo de uso (Clínica Sorriso).
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8"
        >
          <Field label="Nome completo">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              required
              minLength={2}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Senha" hint="Mínimo de 6 caracteres.">
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </Field>

          {error ? <ErrorState message={error} /> : null}

          <button className={`${btn.primaryLg} w-full`} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              "Criar conta"
            )}
          </button>

          <Link
            to="/login"
            className="text-center text-sm font-medium text-primary hover:text-primary-hover"
          >
            Já tenho conta
          </Link>
        </form>
      </div>
    </div>
  );
}
