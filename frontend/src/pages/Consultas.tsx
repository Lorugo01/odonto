import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus, Stethoscope, XCircle } from "lucide-react";
import { api } from "../services/api";
import { Appointment } from "../types";
import { btn } from "../utils/buttonStyles";
import {
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SkeletonRows,
  StatusBadge,
  useToast,
} from "../components/ui";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const hourFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** O paciente também pode desistir de uma solicitação ainda não aprovada. */
const CANCELLABLE = ["REQUESTED", "SCHEDULED", "CONFIRMED"];

export default function Consultas() {
  const toast = useToast();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    const from = new Date();
    from.setMonth(from.getMonth() - 2);
    const to = new Date();
    to.setMonth(to.getMonth() + 4);
    const { data } = await api.get<Appointment[]>(
      `/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
    );
    setItems(data);
  }

  useEffect(() => {
    load()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar consultas"))
      .finally(() => setLoading(false));
  }, []);

  // Próximas primeiro; histórico depois, do mais recente ao mais antigo.
  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const future: Appointment[] = [];
    const history: Appointment[] = [];
    for (const a of items) {
      if (new Date(a.startsAt).getTime() >= now && a.status !== "CANCELLED") future.push(a);
      else history.push(a);
    }
    future.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    history.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return { upcoming: future, past: history };
  }, [items]);

  async function confirmCancel() {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await api.patch(`/appointments/${toCancel.id}`, { status: "CANCELLED" });
      await load();
      toast.success("Consulta cancelada.");
      setToCancel(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar a consulta");
    } finally {
      setCancelling(false);
    }
  }

  function renderItem(a: Appointment) {
    const start = new Date(a.startsAt);
    return (
      <Card key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{dateFmt.format(start)}</span>
            <span className="font-bold tabular-nums text-primary">{hourFmt.format(start)}</span>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Stethoscope size={15} />
            {a.service.name} · {a.professional.name}
          </p>
        </div>
        {CANCELLABLE.includes(a.status) ? (
          <button type="button" className={btn.dangerSm} onClick={() => setToCancel(a)}>
            <XCircle size={14} />
            Cancelar
          </button>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays size={28} />}
            title="Nenhuma consulta"
            description="Você ainda não tem consultas registradas."
            action={
              <Link to="/agendar" className={btn.primary}>
                <CalendarPlus size={16} />
                Agendar horário
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Próximas
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<CalendarPlus size={26} />}
                  title="Sem consultas futuras"
                  action={
                    <Link to="/agendar" className={btn.primary}>
                      <CalendarPlus size={16} />
                      Agendar horário
                    </Link>
                  }
                />
              </Card>
            ) : (
              upcoming.map(renderItem)
            )}
          </section>

          {past.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Histórico
              </h2>
              {past.map(renderItem)}
            </section>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={toCancel !== null}
        title="Cancelar consulta?"
        description={
          toCancel
            ? `${dateFmt.format(new Date(toCancel.startsAt))} às ${hourFmt.format(new Date(toCancel.startsAt))} · ${toCancel.service.name}. Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Sim, cancelar"
        busy={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}
