import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import { Appointment, statusLabel } from "../types";

type Summary = {
  todayCount: number;
  noShowCount: number;
  occupancyPercent: number;
  weekCounts: Array<{ day: string; count: number }>;
};

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [today, setToday] = useState<Appointment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    Promise.all([
      api.get<Summary>("/dashboard/summary"),
      api.get<Appointment[]>(`/appointments?from=${from.toISOString()}&to=${to.toISOString()}`),
    ])
      .then(([s, a]) => {
        setData(s.data);
        setToday(a.data);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi label="Consultas hoje" value={String(data?.todayCount ?? "—")} />
        <Kpi label="Faltas hoje" value={String(data?.noShowCount ?? "—")} />
        <Kpi label="Ocupação (est.)" value={`${data?.occupancyPercent ?? 0}%`} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-64">
        <h2 className="font-semibold mb-2">Volume da semana</h2>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data?.weekCounts ?? []}>
            <XAxis dataKey="day" tickFormatter={(v) => String(v).slice(8, 10)} stroke="#94a3b8" />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="count" fill="#14B8A6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold mb-2">Agenda de hoje</h2>
        {today.length === 0 ? <p className="text-white/50">Nenhuma consulta hoje.</p> : null}
        {today.map((a) => (
          <div key={a.id} className="py-2 border-b border-white/5 text-sm">
            {new Date(a.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
            {a.patient?.name} · {a.service.name} · {statusLabel[a.status] ?? a.status}
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-white/50 text-sm">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
