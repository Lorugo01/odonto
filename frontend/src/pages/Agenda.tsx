import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  MessageSquare,
  UserX,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { Appointment } from "../types";
import { btn } from "../utils/buttonStyles";
import { addDays, localDateKey, startOfToday, toLocalISODate } from "../utils/date";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  SkeletonRows,
  StatusBadge,
  useToast,
} from "../components/ui";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : true,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

const hourFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const requestFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function Agenda() {
  const wide = useMediaQuery("(min-width: 768px)");
  const toast = useToast();
  const [anchor, setAnchor] = useState(startOfToday);
  const [items, setItems] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = new Date(anchor);
    const to = addDays(anchor, wide ? 6 : 0);
    to.setHours(23, 59, 59, 999);
    return { from, to, days: wide ? 7 : 1 };
  }, [anchor, wide]);

  async function load() {
    const { data } = await api.get<Appointment[]>(
      `/appointments?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
    );
    setItems(data);
  }

  /** Solicitações pendentes não têm recorte por data: vêm em endpoint próprio. */
  async function loadRequests() {
    const { data } = await api.get<Appointment[]>("/appointments/requests");
    setRequests(data);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([load(), loadRequests()])
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar agenda"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from.toISOString(), range.to.toISOString()]);

  async function setStatus(id: string, status: string, label: string) {
    setDecidingId(id);
    try {
      await api.patch(`/appointments/${id}`, { status });
      await Promise.all([load(), loadRequests()]);
      toast.success(label);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a consulta");
    } finally {
      setDecidingId(null);
    }
  }

  const days = Array.from({ length: range.days }).map((_, i) => addDays(range.from, i));
  const todayKey = toLocalISODate(startOfToday());

  return (
    <div className="flex flex-col gap-4">
      {requests.length > 0 ? (
        <Card className="border-warning/40 bg-warning-soft/30">
          <CardHeader
            title="Solicitações aguardando resposta"
            subtitle="O horário fica reservado até você aprovar ou recusar."
            icon={<BellRing size={18} />}
          />
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-bold tabular-nums text-ink">
                      {requestFmt.format(new Date(r.startsAt))}
                    </span>
                    {r.patient?.id ? (
                      <Link
                        to={`/pacientes/${r.patient.id}`}
                        className="text-sm font-medium text-ink hover:text-primary"
                      >
                        {r.patient.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-ink">{r.patient?.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {r.service.name} · {r.professional.name}
                  </p>
                  {r.patientNote ? (
                    <p className="mt-1 flex items-start gap-1.5 text-xs italic text-ink-muted">
                      <MessageSquare size={12} className="mt-0.5 shrink-0" />
                      {r.patientNote}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className={btn.successSm}
                    disabled={decidingId === r.id}
                    onClick={() => setStatus(r.id, "SCHEDULED", "Solicitação aprovada.")}
                  >
                    <Check size={13} />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className={btn.dangerSm}
                    disabled={decidingId === r.id}
                    onClick={() => setStatus(r.id, "CANCELLED", "Solicitação recusada.")}
                  >
                    <X size={13} />
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={btn.secondary}
          onClick={() => setAnchor(addDays(anchor, wide ? -7 : -1))}
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        <div className="flex items-center gap-2 text-center">
          <CalendarDays size={16} className="text-primary" />
          <span className="font-semibold capitalize text-ink">
            {wide
              ? `${range.from.toLocaleDateString("pt-BR")} – ${range.to.toLocaleDateString("pt-BR")}`
              : range.from.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}
          </span>
          <button
            type="button"
            className={`${btn.ghostSm} hidden sm:inline-flex`}
            onClick={() => setAnchor(startOfToday())}
          >
            Hoje
          </button>
        </div>

        <button
          type="button"
          className={btn.secondary}
          onClick={() => setAnchor(addDays(anchor, wide ? 7 : 1))}
        >
          Próximo
          <ChevronRight size={16} />
        </button>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : (
        <div className={`grid gap-3 ${wide ? "grid-cols-7" : "grid-cols-1"}`}>
          {days.map((day) => {
            const key = toLocalISODate(day);
            const dayItems = items.filter((a) => localDateKey(a.startsAt) === key);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`flex min-h-[150px] flex-col rounded-xl border bg-surface p-3 shadow-card ${
                  isToday ? "border-primary/40 ring-1 ring-primary/20" : "border-line"
                }`}
              >
                <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                  <span
                    className={`text-xs font-semibold uppercase ${isToday ? "text-primary" : "text-ink-muted"}`}
                  >
                    {day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
                  </span>
                  {dayItems.length > 0 ? (
                    <span className="rounded-full bg-canvas px-1.5 text-xs font-medium text-ink-muted">
                      {dayItems.length}
                    </span>
                  ) : null}
                </div>

                {dayItems.length === 0 ? (
                  <p className="my-auto text-center text-xs text-ink-soft">Sem consultas</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {dayItems.map((a) => (
                      <li key={a.id} className="rounded-lg bg-canvas/70 p-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold tabular-nums text-primary">
                            {hourFmt.format(new Date(a.startsAt))}
                          </span>
                          {a.patient?.id ? (
                            <Link
                              to={`/pacientes/${a.patient.id}`}
                              className="truncate text-sm font-medium text-ink hover:text-primary"
                            >
                              {a.patient.name}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-medium text-ink">
                              {a.patient?.name}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-ink-muted">{a.service.name}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={a.status} />
                          {a.status === "REQUESTED" ? (
                            <>
                              <button
                                type="button"
                                className={btn.successSm}
                                disabled={decidingId === a.id}
                                onClick={() =>
                                  setStatus(a.id, "SCHEDULED", "Solicitação aprovada.")
                                }
                              >
                                <Check size={13} />
                                Aprovar
                              </button>
                              <button
                                type="button"
                                className={btn.dangerSm}
                                disabled={decidingId === a.id}
                                onClick={() =>
                                  setStatus(a.id, "CANCELLED", "Solicitação recusada.")
                                }
                              >
                                <X size={13} />
                                Recusar
                              </button>
                            </>
                          ) : null}
                          {a.status === "SCHEDULED" ? (
                            <button
                              type="button"
                              className={btn.successSm}
                              onClick={() => setStatus(a.id, "CONFIRMED", "Consulta confirmada.")}
                              title="Confirmar"
                            >
                              <Check size={13} />
                              Confirmar
                            </button>
                          ) : null}
                          {a.status === "CONFIRMED" ? (
                            <button
                              type="button"
                              className={btn.primarySm}
                              onClick={() => setStatus(a.id, "COMPLETED", "Consulta concluída.")}
                              title="Concluir"
                            >
                              <CircleCheckBig size={13} />
                              Concluir
                            </button>
                          ) : null}
                          {a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
                            <button
                              type="button"
                              className={btn.dangerSm}
                              onClick={() => setStatus(a.id, "NO_SHOW", "Falta registrada.")}
                              title="Registrar falta"
                            >
                              <UserX size={13} />
                              Falta
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays size={28} />}
            title="Nenhuma consulta no período"
            description="Navegue entre as semanas ou aguarde novos agendamentos."
          />
        </Card>
      ) : null}
    </div>
  );
}
