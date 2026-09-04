import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";

type Patient = { id: string; name: string; email: string; phone: string | null };

export default function Pacientes() {
  const [items, setItems] = useState<Patient[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get<Patient[]>("/patients");
    setItems(data);
  }

  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post("/patients", { name, email, senha: "senha123" });
      setName("");
      setEmail("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={create} className="bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="rounded-md border border-white/10 bg-neutral/60 px-3 py-2" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded-md border border-white/10 bg-neutral/60 px-3 py-2" placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className={btn.primary}>Cadastrar</button>
      </form>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">E-mail</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-white/70">{p.email}</td>
                <td className="p-3 text-right">
                  <Link className="text-primary" to={`/pacientes/${p.id}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
