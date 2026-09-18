import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, Info, Send, Stethoscope, UserRound } from "lucide-react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import { addDays, startOfToday, toLocalISODate } from "../utils/date";
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

type Slot = { startsAt: string; endsAt: string };
type Pro = { id: string; name: string; specialty?: string | null };
type Treatment = {
  serviceId: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};

const hourFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

const DAYS_AHEAD = 14;

/** Chip de seleção (profissional, tratamento, dia, horário). */
function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        active
          ? "border-primary bg-primary text-white shadow-card"
          : "border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft/40"
      }`}
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
  const [note, setNote] = useState("");
  const [loadingPros, setLoadingPros] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Slot | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .get<Pro[]>("/catalog/professionals")
      .then((r) => {
        setPros(r.data);
        if (r.data[0]) setProfessionalId(r.data[0].id);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar profissionais"),
      )
      .finally(() => setLoadingPros(false));
  }, []);

  // Cada dentista oferece a própria lista de tratamentos.
  useEffect(() => {
    if (!professionalId) return;
    setLoadingTreatments(true);
    setSlots([]);
    api
      .get<Treatment[]>(`/treatments/offered?professionalId=${professionalId}`)
      .then((r) => {
        setTreatments(r.data);
        setServiceId(r.data[0]?.serviceId ?? "");
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar tratamentos"),
      )
      .finally(() => setLoadingTreatments(false));
  }, [professionalId]);

  async function loadSlots() {
    if (!serviceId || !professionalId || !date) return;
    const { data } = await api.get<Slot[]>(
      `/availability?professionalId=${professionalId}&serviceId=${serviceId}&date=${date}`,
    );
    // Esconde horários que já passaram no dia de hoje.
    const now = Date.now();
    setSlots(data.filter((s) => new Date(s.startsAt).getTime() > now));
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
      setNote("");
      await loadSlots();
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
            return (
              <Chip key={iso} active={date === iso} onClick={() => setDate(iso)}>
                <span className="flex min-w-[46px] flex-col items-center leading-tight">
                  <span className="text-xs uppercase opacity-75">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className="font-bold">{d.getDate()}</span>
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
        {loadingSlots ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <EmptyState
            icon={<Clock size={28} />}
            title="Nenhum horário livre"
            description="Escolha outro dia ou outro profissional."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Chip key={s.startsAt} active={false} onClick={() => setPending(s)}>
                <span className="tabular-nums">{hourFmt.format(new Date(s.startsAt))}</span>
              </Chip>
            ))}
          </div>
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
