import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import { statusLabel } from "../types";

export default function InicioPaciente() {
  const [data, setData] = useState<{
    nextAppointment: { startsAt: string; service: { name: string }; professional: { name: string }; status: string } | null;
    recentDocuments: Array<{ id: string; title: string }>;
  } | null>(null);

  useEffect(() => {
    void api.get("/dashboard/patient-home").then((r) => setData(r.data));
  }, []);

  const next = data?.nextAppointment;
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold mb-2">Próxima consulta</h2>
        {next ? (
          <p>
            {new Date(next.startsAt).toLocaleString("pt-BR")} · {next.service.name} com {next.professional.name} ·{" "}
            {statusLabel[next.status]}
          </p>
        ) : (
          <p className="text-white/50">Nenhuma consulta marcada.</p>
        )}
        <Link to="/agendar" className={`${btn.primary} mt-3 inline-flex`}>
          Agendar horário
        </Link>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold mb-2">Documentos recentes</h2>
        {data?.recentDocuments.map((d) => (
          <p key={d.id}>{d.title}</p>
        ))}
      </div>
    </div>
  );
}
