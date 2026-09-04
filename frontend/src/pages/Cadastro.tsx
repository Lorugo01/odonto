import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { Usuario } from "../types";
import { btn } from "../utils/buttonStyles";

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
    <div className="min-h-screen flex items-center justify-center bg-neutral p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-neutral/80 border border-white/10 rounded-xl p-8 flex flex-col gap-3"
      >
        <h1 className="text-2xl font-bold">Cadastro do paciente</h1>
        <p className="text-white/50 text-sm">Ao continuar você aceita o termo de uso (Clínica Sorriso).</p>
        <input className="rounded-md border border-white/10 bg-neutral/60 px-3 py-2" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded-md border border-white/10 bg-neutral/60 px-3 py-2" placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rounded-md border border-white/10 bg-neutral/60 px-3 py-2" placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
        {error ? <span className="text-danger text-sm">{error}</span> : null}
        <button className={btn.primaryLg} disabled={loading}>
          {loading ? "Salvando..." : "Criar conta"}
        </button>
        <Link to="/login" className="text-primary text-sm text-center">
          Já tenho conta
        </Link>
      </form>
    </div>
  );
}
