import { FormEvent, useEffect, useState } from "react";
import { FileSignature, Loader2, NotebookPen, Pencil, ShieldCheck, X } from "lucide-react";
import { api } from "../../services/api";
import { btn } from "../../utils/buttonStyles";
import {
  Badge,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Select,
  SkeletonRows,
  Textarea,
  useToast,
} from "../ui";

export type ClinicalNote = {
  id: string;
  body: string;
  authorName: string;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: { id: string | null; startsAt: string; serviceName: string } | null;
  canEdit: boolean;
};

type Appointment = { id: string; startsAt: string; service: { name: string } };

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Timeline de evolução clínica. Evolução assinada fica imutável;
 * correção se faz registrando uma nova.
 */
export function ClinicalNotes({
  patientProfileId,
  appointments,
}: {
  patientProfileId: string;
  appointments: Appointment[];
}) {
  const toast = useToast();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [body, setBody] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [toSign, setToSign] = useState<ClinicalNote | null>(null);
  const [signing, setSigning] = useState(false);

  async function load() {
    const { data } = await api.get<ClinicalNote[]>(
      `/clinical-notes?patientProfileId=${patientProfileId}`,
    );
    setNotes(data);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    load()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar evoluções"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientProfileId]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/clinical-notes", {
        patientProfileId,
        body,
        appointmentId: appointmentId || undefined,
      });
      setBody("");
      setAppointmentId("");
      await load();
      toast.success("Evolução registrada.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a evolução");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await api.patch(`/clinical-notes/${id}`, { body: editBody });
      setEditingId(null);
      await load();
      toast.success("Evolução atualizada.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmSign() {
    if (!toSign) return;
    setSigning(true);
    try {
      await api.post(`/clinical-notes/${toSign.id}/sign`);
      setToSign(null);
      await load();
      toast.success("Evolução assinada.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível assinar");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Nova evolução"
          subtitle="Registro assinado não pode mais ser editado."
          icon={<NotebookPen size={18} />}
        />
        <form onSubmit={create} className="flex flex-col gap-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[120px]"
            placeholder="Queixa, exame clínico, procedimento realizado, prescrição, conduta..."
            required
            minLength={3}
            maxLength={10000}
          />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label="Vincular à consulta" className="min-w-[240px]">
              <Select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
              >
                <option value="">Sem vínculo</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {dateTimeFmt.format(new Date(a.startsAt))} · {a.service.name}
                  </option>
                ))}
              </Select>
            </Field>
            <button className={btn.primary} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <NotebookPen size={16} />
                  Registrar evolução
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <SkeletonRows rows={3} />
      ) : notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<NotebookPen size={28} />}
            title="Nenhuma evolução registrada"
            description="O histórico clínico do paciente aparece aqui, do mais recente ao mais antigo."
          />
        </Card>
      ) : (
        <ol className="flex flex-col gap-3">
          {notes.map((note) => {
            const editing = editingId === note.id;
            return (
              <li key={note.id}>
                <Card
                  className={note.signedAt ? "border-l-4 border-l-success" : "border-l-4 border-l-warning"}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{note.authorName}</span>
                    <span className="text-xs text-ink-soft">
                      {dateTimeFmt.format(new Date(note.createdAt))}
                    </span>
                    {note.signedAt ? (
                      <Badge tone="success" icon={<ShieldCheck size={12} />}>
                        Assinada
                      </Badge>
                    ) : (
                      <Badge tone="warning">Rascunho</Badge>
                    )}
                    {note.appointment ? (
                      <Badge>
                        {note.appointment.serviceName} ·{" "}
                        {new Date(note.appointment.startsAt).toLocaleDateString("pt-BR")}
                      </Badge>
                    ) : null}
                  </div>

                  {editing ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="min-h-[110px]"
                        minLength={3}
                        maxLength={10000}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={btn.secondarySm}
                          onClick={() => setEditingId(null)}
                          disabled={savingEdit}
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={btn.primarySm}
                          onClick={() => saveEdit(note.id)}
                          disabled={savingEdit || editBody.trim().length < 3}
                        >
                          {savingEdit ? <Loader2 size={14} className="animate-spin" /> : null}
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {note.body}
                    </p>
                  )}

                  {note.canEdit && !editing ? (
                    <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
                      <button
                        type="button"
                        className={btn.secondarySm}
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body);
                        }}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className={btn.successSm}
                        onClick={() => setToSign(note)}
                      >
                        <FileSignature size={14} />
                        Assinar
                      </button>
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        open={toSign !== null}
        tone="primary"
        title="Assinar evolução?"
        description="Depois de assinada a evolução não pode mais ser editada. Uma correção exige registrar uma nova evolução."
        confirmLabel="Assinar"
        busy={signing}
        onConfirm={confirmSign}
        onCancel={() => setToSign(null)}
      />
    </div>
  );
}
