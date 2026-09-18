import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, Stethoscope, X } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { btn } from "../utils/buttonStyles";
import { canManageCatalog } from "../types";
import { centsToInput, formatCents, parseCents } from "../utils/money";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  SkeletonRows,
  Textarea,
  useToast,
} from "../components/ui";

type Treatment = {
  serviceId: string;
  treatmentId: string | null;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  active: boolean;
  catalog: { description: string | null; durationMin: number; priceCents: number };
  /** Ajustes do dentista; `null` em um campo significa herdar o catálogo. */
  own: { description: string | null; durationMin: number | null; priceCents: number | null } | null;
  customized: boolean;
};

type ListResponse = {
  professional: { id: string; name: string };
  treatments: Treatment[];
};

type Pro = { id: string; name: string; specialty?: string | null };

type Draft = { description: string; durationMin: string; price: string };

/**
 * O dentista escolhe quais tratamentos atende e descreve cada um. Campos em
 * branco herdam o valor do catálogo da clínica.
 */
export default function Tratamentos() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = canManageCatalog(user);

  const [pros, setPros] = useState<Pro[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ description: "", durationMin: "", price: "" });
  const [savingId, setSavingId] = useState<string | null>(null);

  // O administrador escolhe de qual profissional está configurando os tratamentos.
  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<Pro[]>("/catalog/professionals")
      .then((r) => setPros(r.data))
      .catch(() => setPros([]));
  }, [isAdmin]);

  async function load(target: string) {
    const query = target ? `?professionalId=${target}` : "";
    const res = await api.get<ListResponse>(`/treatments${query}`);
    setData(res.data);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    load(professionalId)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar tratamentos"),
      )
      .finally(() => setLoading(false));
  }, [professionalId]);

  const active = useMemo(() => data?.treatments.filter((t) => t.active) ?? [], [data]);
  const inactive = useMemo(() => data?.treatments.filter((t) => !t.active) ?? [], [data]);

  function startEdit(t: Treatment) {
    setEditing(t.serviceId);
    // Só os ajustes próprios vão para o formulário; o resto fica como placeholder.
    setDraft({
      description: t.own?.description ?? "",
      durationMin: t.own?.durationMin != null ? String(t.own.durationMin) : "",
      price: t.own?.priceCents != null ? centsToInput(t.own.priceCents) : "",
    });
  }

  async function send(
    t: Treatment,
    body: {
      description: string | null;
      durationMin: number | null;
      priceCents: number | null;
      active: boolean;
    },
  ) {
    setSavingId(t.serviceId);
    try {
      await api.put("/treatments", {
        serviceId: t.serviceId,
        professionalId: professionalId || undefined,
        ...body,
      });
      await load(professionalId);
      setEditing(null);
      toast.success("Tratamento atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o tratamento");
    } finally {
      setSavingId(null);
    }
  }

  /** Liga/desliga o tratamento preservando a personalização já feita. */
  function setActive(t: Treatment, active: boolean) {
    return send(t, {
      description: t.own?.description ?? null,
      durationMin: t.own?.durationMin ?? null,
      priceCents: t.own?.priceCents ?? null,
      active,
    });
  }

  function saveDraft(t: Treatment) {
    const price = draft.price.trim();
    const priceCents = price === "" ? null : parseCents(price);
    if (price !== "" && priceCents === null) {
      toast.error("Informe um valor válido, como 150,00");
      return;
    }
    const duration = draft.durationMin.trim();
    const durationMin = duration === "" ? null : Number(duration);
    if (durationMin !== null && (!Number.isInteger(durationMin) || durationMin < 5)) {
      toast.error("A duração mínima é de 5 minutos");
      return;
    }
    return send(t, {
      description: draft.description.trim() || null,
      durationMin,
      priceCents,
      active: true,
    });
  }

  function renderRow(t: Treatment) {
    const isEditing = editing === t.serviceId;
    const busy = savingId === t.serviceId;

    return (
      <li key={t.serviceId} className="py-3">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{t.name}</span>
              {t.active ? (
                <Badge tone="success">Atendo</Badge>
              ) : (
                <Badge>Não atendo</Badge>
              )}
              {t.customized ? <Badge tone="primary">Personalizado</Badge> : null}
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              {t.description ?? "Sem descrição."}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} />
                {t.durationMin} min
              </span>
              <span className="font-medium text-ink-muted">{formatCents(t.priceCents)}</span>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {t.active ? (
              <>
                <button
                  type="button"
                  className={btn.secondarySm}
                  onClick={() => (isEditing ? setEditing(null) : startEdit(t))}
                  disabled={busy}
                >
                  {isEditing ? "Fechar" : "Ajustar"}
                </button>
                <button
                  type="button"
                  className={btn.dangerSm}
                  onClick={() => setActive(t, false)}
                  disabled={busy}
                >
                  <X size={14} />
                  Não atendo
                </button>
              </>
            ) : (
              <button
                type="button"
                className={btn.primarySm}
                onClick={() => setActive(t, true)}
                disabled={busy}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Passar a atender
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Duração própria (min)"
                hint={`Em branco usa ${t.catalog.durationMin} min do catálogo`}
              >
                <Input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={draft.durationMin}
                  onChange={(e) => setDraft((d) => ({ ...d, durationMin: e.target.value }))}
                  placeholder={String(t.catalog.durationMin)}
                />
              </Field>
              <Field
                label="Valor próprio (R$)"
                hint={`Em branco usa ${formatCents(t.catalog.priceCents)} do catálogo`}
              >
                <Input
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                  placeholder={centsToInput(t.catalog.priceCents)}
                  inputMode="decimal"
                />
              </Field>
            </div>
            <Field
              label="Descrição do tratamento"
              className="mt-3"
              hint="Em branco usa a descrição do catálogo."
            >
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="min-h-[80px]"
                placeholder={
                  t.catalog.description ?? "Explique ao paciente como você realiza este tratamento."
                }
              />
            </Field>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className={btn.primary}
                onClick={() => saveDraft(t)}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar tratamento"
                )}
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  }

  if (loading) return <SkeletonRows rows={5} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {isAdmin && pros.length > 0 ? (
        <Card>
          <Field label="Configurar tratamentos de" className="max-w-sm">
            <Select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              <option value="">Eu mesmo</option>
              {pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      ) : null}

      {data && data.treatments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Stethoscope size={28} />}
            title="Nenhum serviço no catálogo"
            description="O administrador precisa cadastrar os tipos de tratamento em Serviços."
          />
        </Card>
      ) : null}

      {active.length > 0 ? (
        <Card>
          <CardHeader
            title="Tratamentos que atendo"
            subtitle={`${active.length} tratamento(s) oferecidos aos pacientes`}
            icon={<Stethoscope size={18} />}
          />
          <ul className="divide-y divide-line">{active.map(renderRow)}</ul>
        </Card>
      ) : null}

      {inactive.length > 0 ? (
        <Card>
          <CardHeader
            title="Disponíveis no catálogo"
            subtitle="Marque os que você também atende."
            icon={<Stethoscope size={18} />}
          />
          <ul className="divide-y divide-line">{inactive.map(renderRow)}</ul>
        </Card>
      ) : null}
    </div>
  );
}
