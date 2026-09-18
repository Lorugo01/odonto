import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarCheck, CalendarX2, Clock, TrendingUp } from "lucide-react";
import { api } from "../services/api";
import { Appointment } from "../types";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonRows,
  StatCard,
  StatusBadge,
} from "../components/ui";

type Summary = {
  todayCount: number;
  noShowCount: number;
  occupancyPercent: number;
  weekCounts: Array<{ day: string; count: number }>;
};

const hourFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [today, setToday] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  const chartData = (data?.weekCounts ?? []).map((w) => ({
    ...w,
    label: new Date(`${w.day}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)
        ) : (
          <>
            <StatCard
              label="Consultas hoje"
              value={String(data?.todayCount ?? 0)}
              icon={<CalendarCheck size={20} />}
            />
            <StatCard
              label="Faltas hoje"
              value={String(data?.noShowCount ?? 0)}
              icon={<CalendarX2 size={20} />}
              tone="warning"
            />
            <StatCard
              label="Ocupação"
              value={`${data?.occupancyPercent ?? 0}%`}
              icon={<TrendingUp size={20} />}
              tone="success"
              hint="Estimativa do dia"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader
          title="Volume da semana"
          subtitle="Consultas ativas por dia nos últimos 7 dias"
          icon={<TrendingUp size={18} />}
        />
        <div className="h-60">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#0F172A",
                  }}
                  labelStyle={{ color: "#64748B" }}
                  formatter={(value: number) => [String(value), "Consultas"]}
                />
                <Bar dataKey="count" fill="#0D9488" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Agenda de hoje"
          subtitle={loading ? undefined : `${today.length} consulta(s)`}
          icon={<Clock size={18} />}
        />
        {loading ? (
          <SkeletonRows rows={3} />
        ) : today.length === 0 ? (
          <EmptyState
            icon={<Clock size={28} />}
            title="Nenhuma consulta hoje"
            description="Os agendamentos do dia aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {today.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="font-semibold tabular-nums text-ink">
                  {hourFmt.format(new Date(a.startsAt))}
                </span>
                <span className="font-medium text-ink">{a.patient?.name}</span>
                <span className="text-ink-muted">{a.service.name}</span>
                <StatusBadge status={a.status} className="ml-auto" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
