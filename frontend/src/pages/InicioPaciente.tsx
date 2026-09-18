import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Clock, FileText, Stethoscope } from "lucide-react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import { useAuthStore } from "../store/auth";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonRows,
  StatusBadge,
} from "../components/ui";

type PatientHome = {
  nextAppointment: {
    startsAt: string;
    service: { name: string };
    professional: { name: string };
    status: string;
  } | null;
  recentDocuments: Array<{ id: string; title: string; type?: string; createdAt?: string }>;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" });
const hourFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function InicioPaciente() {
  const firstName = useAuthStore((s) => s.user?.name?.split(" ")[0] ?? "");
  const [data, setData] = useState<PatientHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<PatientHome>("/dashboard/patient-home")
      .then((r) => setData(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  const next = data?.nextAppointment;

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <Card className="bg-primary-soft/60">
        <p className="text-sm text-ink-muted">Olá{firstName ? `, ${firstName}` : ""}</p>
        <p className="text-lg font-bold text-ink">Bem-vindo à Clínica</p>
      </Card>

      <Card>
        <CardHeader
          title="Próxima consulta"
          icon={<Clock size={18} />}
          actions={
            <Link to="/agendar" className={btn.primarySm}>
              <CalendarPlus size={14} />
              Agendar
            </Link>
          }
        />
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : next ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-primary">
                {hourFmt.format(new Date(next.startsAt))}
              </span>
              <StatusBadge status={next.status} />
            </div>
            <p className="text-sm capitalize text-ink">{dateFmt.format(new Date(next.startsAt))}</p>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Stethoscope size={15} />
              {next.service.name} com {next.professional.name}
            </p>
          </div>
        ) : (
          <EmptyState
            icon={<Clock size={28} />}
            title="Nenhuma consulta marcada"
            description="Escolha um serviço e um horário disponível."
            action={
              <Link to="/agendar" className={btn.primary}>
                <CalendarPlus size={16} />
                Agendar horário
              </Link>
            }
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Documentos recentes"
          icon={<FileText size={18} />}
          actions={
            <Link to="/meus-documentos" className="text-sm font-medium text-primary">
              Ver todos
            </Link>
          }
        />
        {loading ? (
          <SkeletonRows rows={2} />
        ) : (data?.recentDocuments.length ?? 0) === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title="Nenhum documento"
            description="Receitas e atestados da clínica aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data?.recentDocuments.map((d) => (
              <li key={d.id} className="flex items-center gap-2 py-2.5 text-sm">
                <FileText size={15} className="shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                {d.createdAt ? (
                  <span className="shrink-0 text-xs text-ink-soft">
                    {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
