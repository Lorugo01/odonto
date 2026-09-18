import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, Info, Send, Stethoscope, UserRound } from "lucide-react";
import { api } from "../services/api";
import { addDays, localDateKey, startOfToday, toLocalISODate } from "../utils/date";
import { formatCents } from "../utils/money";
import {
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Skeleton,
  Textarea,
  useToast,
} from "../components/ui";

type SlotStatus = "free" | "busy" | "mine";
type Slot = { startsAt: string; endsAt: string; status: SlotStatus };
type DayMine = {
  startsAt: string;
  endsAt: string;
  serviceName: string;
  professionalName: string;
};
type Availability = { open?: boolean; slots: Slot[]; yourDay: DayMine[] };
type Pro = { id: string; name: string; specialty?: string | null };
type Treatment = {
  serviceId: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};
type AppointmentDay = { id: string; startsAt: string; status: string };

const hourFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

const DAYS_AHEAD = 14;
const ACTIVE_STATUSES = new Set(["REQUESTED", "SCHEDULED", "CONFIRMED"]);

function chipClass(active: boolean, disabled?: boolean, tone: SlotStatus | "day" = "free") {
  if (tone === "mine") {
    return "border-primary bg-primary-soft text-primary cursor-default";
  }
  if (tone === "busy") {
    return "border-line bg-canvas text-ink-soft line-through cursor-not-allowed";
  }
  if (disabled) {
    return "border-line bg-surface text-ink opacity-50 cursor-not-allowed";
  }
  return active
    ? "border-primary bg-primary text-white shadow-card"
    : "border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft/40";
}

/** Chip de seleção (profissional, tratamento, dia, horário). */
function Chip({
  active,
  onClick,
  children,
  disabled,
  tone = "free",
  title,
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: SlotStatus | "day";
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${chipClass(active, disabled, tone)}`}
    >
      {children}
    </button>
  );
}

/**
 * O paciente não marca a consulta: escolhe o dentista, o tratamento que aquele
 * profissional atende e envia uma solicitação para a clínica aprovar.
 */
export default function Agendar() {
  const toast = useToast();
  const [pros, setPros] = useState<Pro[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(() => toLocalISODate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dayOpen, setDayOpen] = useState(true);
  const [yourDay, setYourDay] = useState<DayMine[]>([]);
  const [myAppointments, setMyAppointments] = useState<AppointmentDay[]>([]);
  const [note, setNote] = useState("");
  const [loadingPros, setLoadingPros] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Slot | null>(null);
  const [sending, setSending] = useState(false);

  async function loadMyAppointments() {
    const from = startOfToday();
    const to = addDays(from, DAYS_AHEAD);
    to.setHours(23, 59, 59, 999);
    const { data } = await api.get<AppointmentDay[]>(
      `/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
    );
    setMyAppointments(data.filter((a) => ACTIVE_STATUSES.has(a.status)));
  }

  useEffect(() => {
    Promise.all([
      api.get<Pro[]>("/catalog/professionals").then((r) => {
        setPros(r.data);
        if (r.data[0]) setProfessionalId((current) => current || r.data[0].id);
      }),
      loadMyAppointments(),
    ])
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar profissionais"),
      )
      .finally(() => setLoadingPros(false));
  }, []);

  // Cada dentista oferece a própria lista de tratamentos.
  useEffect(() => {
    if (!professionalId) return;
    setLoadingTreatments(true);
    api
      .get<Treatment[]>(`/treatments/offered?professionalId=${professionalId}`)
      .then((r) => {
        setTreatments(r.data);
        setServiceId((current) =>
          r.data.some((t) => t.serviceId === current) ? current : (r.data[0]?.serviceId ?? ""),
        );
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar tratamentos"),
      )
      .finally(() => setLoadingTreatments(false));
  }, [professionalId]);

  async function loadSlots() {
    if (!serviceId || !professionalId || !date) return;
    const { data } = await api.get<Availability>(
      `/availability?professionalId=${professionalId}&serviceId=${serviceId}&date=${date}`,
    );
    setSlots(data.slots);
    setDayOpen(data.open !== false);
    setYourDay(data.yourDay);
  }

  useEffect(() => {
    if (!serviceId || !professionalId || !date) return;
    setLoadingSlots(true);
    loadSlots()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao buscar horários"))
      .finally(() => setLoadingSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, professionalId, date]);

  async function confirmRequest() {
    if (!pending) return;
    setSending(true);
    try {
      await api.post("/appointments", {
        professionalId,
        serviceId,
        startsAt: pending.startsAt,
        patientNote: note.trim() || undefined,
      });
      setPending(null);
      await Promise.all([loadSlots(), loadMyAppointments()]);
      toast.success("Solicitação enviada. A clínica vai confirmar o horário.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a solicitação");
    } finally {
      setSending(false);
    }
  }

  const selectedTreatment = useMemo(
    () => treatments.find((t) => t.serviceId === serviceId),
    [treatments, serviceId],
  );
  const selectedPro = pros.find((p) => p.id === professionalId);
  const days = Array.from({ length: DAYS_AHEAD }).map((_, i) => addDays(startOfToday(), i));
  const busyDays = useMemo(() => {
    const keys = new Set<string>();
    for (const a of myAppointments) keys.add(localDateKey(a.startsAt));
    return keys;
  }, [myAppointments]);

  function slotTitle(s: Slot) {
    if (s.status === "mine") return "Este horário já é seu";
    if (s.status === "busy") return "Horário ocupado";
    return "Solicitar este horário";
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <Card>
        <CardHeader title="Profissional" icon={<UserRound size={18} />} />
        {loadingPros ? (
          <Skeleton className="h-10 w-full" />
        ) : pros.length === 0 ? (
          <EmptyState
            icon={<UserRound size={28} />}
            title="Nenhum profissional disponível"
            description="Entre em contato com a clínica."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {pros.map((p) => (
              <Chip
                key={p.id}
                active={professionalId === p.id}
                onClick={() => setProfessionalId(p.id)}
              >
                {p.name}
                {p.specialty ? (
                  <span className="ml-1.5 text-xs opacity-75">{p.specialty}</span>
                ) : null}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Tratamento"
          subtitle={selectedPro ? `Atendidos por ${selectedPro.name}` : undefined}
          icon={<Stethoscope size={18} />}
        />
        {loadingTreatments ? (
          <Skeleton className="h-10 w-full" />
        ) : treatments.length === 0 ? (
          <EmptyState
            icon={<Stethoscope size={28} />}
            title="Nenhum tratamento disponível"
            description="Este profissional ainda não cadastrou os tratamentos que atende."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {treatments.map((t) => (
                <Chip
                  key={t.serviceId}
                  active={serviceId === t.serviceId}
                  onClick={() => setServiceId(t.serviceId)}
                >
                  <span>{t.name}</span>
                  <span className="ml-1.5 text-xs opacity-75">{t.durationMin} min</span>
                </Chip>
              ))}
            </div>
            {selectedTreatment ? (
              <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
                {selectedTreatment.description ? (
                  <p className="text-sm text-ink-muted">{selectedTreatment.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-ink-soft">
                  Valor de referência: {formatCents(selectedTreatment.priceCents)}
                </p>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <CardHeader title="Dia desejado" icon={<CalendarPlus size={18} />} />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const iso = toLocalISODate(d);
            const hasMine = busyDays.has(iso);
            return (
              <Chip
                key={iso}
                active={date === iso}
                onClick={() => setDate(iso)}
                title={hasMine ? "Você já tem horário neste dia" : undefined}
              >
                <span className="flex min-w-[46px] flex-col items-center leading-tight">
                  <span className="text-xs uppercase opacity-75">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className="font-bold">{d.getDate()}</span>
                  {hasMine ? (
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warning" />
                  ) : (
                    <span className="mt-0.5 h-1.5 w-1.5" />
                  )}
                </span>
              </Chip>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Motivo da consulta" icon={<Info size={18} />} />
        <Field label="Conte o que está sentindo (opcional)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[70px]"
            maxLength={500}
            placeholder="Dor no dente de baixo do lado direito há três dias."
          />
        </Field>
      </Card>

      <Card>
        <CardHeader
          title="Horários desejados"
          subtitle={
            selectedTreatment && selectedPro
              ? `${selectedTreatment.name} com ${selectedPro.name}`
              : undefined
          }
          icon={<Clock size={18} />}
        />
        {yourDay.length > 0 ? (
          <div className="mb-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-ink">
            Você já tem horário neste dia
            {yourDay.map((a) => (
              <span key={a.startsAt} className="block text-ink-muted">
                {hourFmt.format(new Date(a.startsAt))} · {a.serviceName} com {a.professionalName}
              </span>
            ))}
          </div>
        ) : null}
        {loadingSlots ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>
        ) : !dayOpen ? (
          <EmptyState
            icon={<Clock size={28} />}
            title="Profissional não atende neste dia"
            description="Escolha outro dia ou outro profissional."
          />
        ) : slots.length === 0 ? (
          <EmptyState
            icon={<Clock size={28} />}
            title="Nenhum horário neste dia"
            description="Escolha outro dia ou outro profissional."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <Chip
                  key={s.startsAt}
                  active={s.status === "mine"}
                  disabled={s.status !== "free"}
                  tone={s.status}
                  title={slotTitle(s)}
                  onClick={s.status === "free" ? () => setPending(s) : undefined}
                >
                  <span className="tabular-nums">{hourFmt.format(new Date(s.startsAt))}</span>
                </Chip>
              ))}
            </div>
            <p className="mt-3 flex flex-wrap gap-3 text-xs text-ink-soft">
              <span>Horário livre</span>
              <span className="text-primary">Horário seu</span>
              <span className="line-through">Horário ocupado</span>
            </p>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={pending !== null}
        tone="primary"
        title="Enviar solicitação?"
        description={
          pending ? (
            <>
              {longDateFmt.format(new Date(pending.startsAt))} às{" "}
              {hourFmt.format(new Date(pending.startsAt))} · {selectedTreatment?.name ?? ""} com{" "}
              {selectedPro?.name ?? ""}.
              <br />
              O horário fica reservado até a clínica confirmar.
              {yourDay.length > 0 ? (
                <>
                  <br />
                  Você já tem consulta neste dia
                  {yourDay.map((a) => (
                    <span key={a.startsAt}>
                      {" "}
                      ({hourFmt.format(new Date(a.startsAt))} · {a.serviceName}).
                    </span>
                  ))}
                </>
              ) : null}
            </>
          ) : undefined
        }
        confirmLabel="Solicitar"
        busy={sending}
        onConfirm={confirmRequest}
        onCancel={() => setPending(null)}
      />

      <p className="flex items-start justify-center gap-1.5 text-center text-xs text-ink-soft">
        <Send size={13} className="mt-0.5 shrink-0" />
        A clínica avalia o pedido e confirma o horário. Acompanhe em Consultas.
      </p>
    </div>
  );
}
