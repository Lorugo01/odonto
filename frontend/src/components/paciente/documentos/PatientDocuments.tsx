import { FormEvent, useEffect, useMemo, useState } from "react";
import { FilePlus2, FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { api } from "../../../services/api";
import { useAuthStore } from "../../../store/auth";
import { btn } from "../../../utils/buttonStyles";
import { documentPrintPath } from "../../../utils/documents";
import { toLocalISODate } from "../../../utils/date";
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
} from "../../ui";
import { DocumentTypeCode, documentTypeLabel, documentTypesFor } from "./document-types";

type DocumentSummary = {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  authorName: string | null;
  printable: boolean;
};

type Appointment = { id: string; startsAt: string; service: { name: string } };

type Medication = { name: string; quantity: string; instructions: string };

type Fields = {
  medications: Medication[];
  notes: string;
  days: string;
  startDate: string;
  reason: string;
  cid: string;
  date: string;
  startTime: string;
  endTime: string;
  specialty: string;
  findings: string;
  procedure: string;
  instructions: string;
  title: string;
  body: string;
};

const emptyMedication: Medication = { name: "", quantity: "", instructions: "" };

function initialFields(): Fields {
  const today = toLocalISODate(new Date());
  return {
    medications: [{ ...emptyMedication }],
    notes: "",
    days: "1",
    startDate: today,
    reason: "",
    cid: "",
    date: today,
    startTime: "",
    endTime: "",
    specialty: "",
    findings: "",
    procedure: "",
    instructions: "",
    title: "",
    body: "",
  };
}

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Monta apenas os campos que o modelo escolhido consome. */
function payloadFor(type: DocumentTypeCode, f: Fields): Record<string, unknown> {
  switch (type) {
    case "RECEITA":
      return {
        medications: f.medications.map((m) => ({
          name: m.name,
          quantity: m.quantity || undefined,
          instructions: m.instructions,
        })),
        notes: f.notes || undefined,
      };
    case "ATESTADO":
      return {
        days: Number(f.days),
        startDate: f.startDate,
        reason: f.reason || undefined,
        cid: f.cid || undefined,
      };
    case "DECLARACAO":
      return {
        date: f.date,
        startTime: f.startTime || undefined,
        endTime: f.endTime || undefined,
      };
    case "ENCAMINHAMENTO":
      return {
        specialty: f.specialty,
        reason: f.reason,
        findings: f.findings || undefined,
      };
    case "ORIENTACAO":
      return { procedure: f.procedure, instructions: f.instructions };
    case "ANOTACAO":
      return { title: f.title, body: f.body };
  }
}

export function PatientDocuments({
  patientProfileId,
  appointments,
}: {
  patientProfileId: string;
  appointments: Appointment[];
}) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const available = useMemo(() => documentTypesFor(user), [user]);

  const [items, setItems] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState<DocumentTypeCode | null>(null);
  const [fields, setFields] = useState<Fields>(initialFields);
  const [appointmentId, setAppointmentId] = useState("");
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!type && available[0]) setType(available[0].code);
  }, [available, type]);

  async function load() {
    const { data } = await api.get<DocumentSummary[]>(
      `/documents?patientProfileId=${patientProfileId}`,
    );
    setItems(data);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    load()
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar documentos"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientProfileId]);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function setMedication(index: number, patch: Partial<Medication>) {
    setFields((f) => ({
      ...f,
      medications: f.medications.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  async function issue(e: FormEvent) {
    e.preventDefault();
    if (!type || issuing) return;
    setIssuing(true);
    try {
      const { data } = await api.post<{ id: string }>("/documents/issue", {
        patientProfileId,
        type,
        fields: payloadFor(type, fields),
        appointmentId: appointmentId || undefined,
      });
      setFields(initialFields());
      setAppointmentId("");
      await load();
      toast.success("Documento emitido.");
      window.open(documentPrintPath(data.id), "_blank", "noopener");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível emitir o documento");
    } finally {
      setIssuing(false);
    }
  }

  if (available.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText size={28} />}
          title="Sem permissão para emitir documentos"
          description="Fale com o administrador da clínica."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Emitir documento"
          subtitle="O texto é gerado com o timbre da clínica e a identificação do profissional."
          icon={<FilePlus2 size={18} />}
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {available.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => {
                setType(t.code);
                setFields(initialFields());
              }}
              aria-pressed={type === t.code}
              className={`rounded-lg border p-2.5 text-left transition-colors ${
                type === t.code
                  ? "border-primary bg-primary-soft"
                  : "border-line bg-surface hover:border-primary/40"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  type === t.code ? "text-primary" : "text-ink"
                }`}
              >
                {t.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                {t.description}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={issue} className="flex flex-col gap-3">
          {type === "RECEITA" ? (
            <>
              <div className="flex flex-col gap-3">
                {fields.medications.map((med, index) => (
                  <div key={index} className="rounded-lg border border-line bg-canvas p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-muted">
                        Medicamento {index + 1}
                      </span>
                      {fields.medications.length > 1 ? (
                        <button
                          type="button"
                          className="text-ink-soft transition-colors hover:text-danger"
                          aria-label={`Remover medicamento ${index + 1}`}
                          onClick={() =>
                            set(
                              "medications",
                              fields.medications.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Field label="Medicamento" className="sm:col-span-2">
                        <Input
                          value={med.name}
                          onChange={(e) => setMedication(index, { name: e.target.value })}
                          placeholder="Amoxicilina 500mg"
                          required
                        />
                      </Field>
                      <Field label="Quantidade">
                        <Input
                          value={med.quantity}
                          onChange={(e) => setMedication(index, { quantity: e.target.value })}
                          placeholder="21 cápsulas"
                        />
                      </Field>
                      <Field label="Posologia" className="sm:col-span-3">
                        <Input
                          value={med.instructions}
                          onChange={(e) => setMedication(index, { instructions: e.target.value })}
                          placeholder="Tomar 1 cápsula de 8 em 8 horas por 7 dias."
                          required
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={`${btn.secondarySm} self-start`}
                  onClick={() => set("medications", [...fields.medications, { ...emptyMedication }])}
                >
                  <Plus size={14} />
                  Adicionar medicamento
                </button>
              </div>
              <Field label="Observações">
                <Textarea
                  value={fields.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="min-h-[70px]"
                  placeholder="Retornar em caso de dor persistente."
                />
              </Field>
            </>
          ) : null}

          {type === "ATESTADO" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Dias de afastamento">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={fields.days}
                  onChange={(e) => set("days", e.target.value)}
                  required
                />
              </Field>
              <Field label="A partir de">
                <Input
                  type="date"
                  value={fields.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  required
                />
              </Field>
              <Field label="Motivo" className="sm:col-span-2">
                <Input
                  value={fields.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder="Procedimento cirúrgico odontológico"
                />
              </Field>
              <Field label="CID (opcional)" hint="Informe somente com autorização do paciente.">
                <Input value={fields.cid} onChange={(e) => set("cid", e.target.value)} />
              </Field>
            </div>
          ) : null}

          {type === "DECLARACAO" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Data do atendimento">
                <Input
                  type="date"
                  value={fields.date}
                  onChange={(e) => set("date", e.target.value)}
                  required
                />
              </Field>
              <Field label="Das">
                <Input
                  type="time"
                  value={fields.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </Field>
              <Field label="Às">
                <Input
                  type="time"
                  value={fields.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              </Field>
            </div>
          ) : null}

          {type === "ENCAMINHAMENTO" ? (
            <div className="flex flex-col gap-3">
              <Field label="Especialidade">
                <Input
                  value={fields.specialty}
                  onChange={(e) => set("specialty", e.target.value)}
                  placeholder="Endodontia"
                  required
                />
              </Field>
              <Field label="Motivo do encaminhamento">
                <Textarea
                  value={fields.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  className="min-h-[80px]"
                  required
                />
              </Field>
              <Field label="Achados clínicos">
                <Textarea
                  value={fields.findings}
                  onChange={(e) => set("findings", e.target.value)}
                  className="min-h-[70px]"
                  placeholder="Dente 36 com lesão periapical visível em radiografia."
                />
              </Field>
            </div>
          ) : null}

          {type === "ORIENTACAO" ? (
            <div className="flex flex-col gap-3">
              <Field label="Procedimento realizado">
                <Input
                  value={fields.procedure}
                  onChange={(e) => set("procedure", e.target.value)}
                  placeholder="Exodontia do dente 38"
                  required
                />
              </Field>
              <Field label="Orientações">
                <Textarea
                  value={fields.instructions}
                  onChange={(e) => set("instructions", e.target.value)}
                  className="min-h-[140px]"
                  placeholder={"- Evitar alimentos quentes nas primeiras 24 horas\n- Não bochechar com força"}
                  required
                />
              </Field>
            </div>
          ) : null}

          {type === "ANOTACAO" ? (
            <div className="flex flex-col gap-3">
              <Field label="Título">
                <Input
                  value={fields.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  minLength={2}
                />
              </Field>
              <Field label="Conteúdo">
                <Textarea
                  value={fields.body}
                  onChange={(e) => set("body", e.target.value)}
                  className="min-h-[140px]"
                  required
                />
              </Field>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
            <Field label="Vincular à consulta" className="min-w-[240px]">
              <Select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
                <option value="">Sem vínculo</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {dateTimeFmt.format(new Date(a.startsAt))} · {a.service.name}
                  </option>
                ))}
              </Select>
            </Field>
            <button className={btn.primary} disabled={issuing}>
              {issuing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Emitindo...
                </>
              ) : (
                <>
                  <Printer size={16} />
                  Emitir e imprimir
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      <Card>
        <CardHeader
          title="Documentos do paciente"
          subtitle={loading ? undefined : `${items.length} documento(s)`}
          icon={<FileText size={18} />}
        />
        {loading ? (
          <SkeletonRows rows={3} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title="Nenhum documento emitido"
            description="Receitas, atestados e declarações aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <FileText size={15} className="shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{d.title}</span>
                <Badge>{documentTypeLabel(d.type)}</Badge>
                <span className="text-xs text-ink-soft">
                  {dateTimeFmt.format(new Date(d.createdAt))}
                </span>
                {d.printable ? (
                  <a
                    href={documentPrintPath(d.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    <Printer size={14} />
                    Imprimir
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
