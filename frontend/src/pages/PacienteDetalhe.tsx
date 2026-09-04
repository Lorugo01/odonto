import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";
import { statusLabel } from "../types";
import { btn } from "../utils/buttonStyles";

export default function PacienteDetalhe() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [title, setTitle] = useState("");

  async function load() {
    const res = await api.get(`/patients/${id}`);
    setData(res.data);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function addDoc(e: FormEvent) {
    e.preventDefault();
    await api.post("/documents", { patientProfileId: id, title, type: "anotacao" });
    setTitle("");
    await load();
  }

  if (!data) return <p className="text-white/50">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="text-xl font-bold">{data.patient.name}</h2>
        <p className="text-white/50">{data.patient.email}</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="font-semibold mb-2">Histórico</h3>
        {data.appointments.map((a: any) => (
          <p key={a.id} className="text-sm py-1">
            {new Date(a.startsAt).toLocaleString("pt-BR")} · {a.service.name} · {statusLabel[a.status]}
          </p>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="font-semibold mb-2">Documentos</h3>
        {data.documents.map((d: any) => (
          <p key={d.id} className="text-sm py-1">
            {d.title} ({d.type})
          </p>
        ))}
        <form onSubmit={addDoc} className="flex flex-col sm:flex-row gap-2 mt-3">
          <input className="flex-1 rounded-md border border-white/10 bg-neutral/60 px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Novo documento" />
          <button className={btn.primary}>Adicionar</button>
        </form>
      </div>
    </div>
  );
}
