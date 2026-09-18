import { FormEvent, useEffect, useState } from "react";
import { Archive, Clock, Loader2, Pencil, Plus, Tags, Trash2, Undo2, X } from "lucide-react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import { centsToInput, formatCents, parseCents } from "../utils/money";
import {
  Badge,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SkeletonRows,
  Textarea,
  useToast,
} from "../components/ui";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  active: boolean;
};

type FormState = {
  name: string;
  description: string;
  durationMin: string;
  price: string;
};

const emptyForm: FormState = { name: "", description: "", durationMin: "30", price: "" };

/** Catálogo de tipos de tratamento da clínica. Só o administrador acessa. */
export default function Servicos() {
  const toast = useToast();
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Service | null>(null);

  async function load() {
    const { data } = await api.get<Service[]>("/catalog/services?includeInactive=true");
    setItems(data);
  }

  useEffect(() => {
    load()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar serviços"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMin: String(service.durationMin),
      price: centsToInput(service.priceCents),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const priceCents = parseCents(form.price);
    if (priceCents === null) {
      toast.error("Informe um valor válido, como 150,00");
      return;
    }
    const durationMin = Number(form.durationMin);
    if (!Number.isInteger(durationMin) || durationMin < 5) {
      toast.error("A duração mínima é de 5 minutos");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        durationMin,
        priceCents,
      };
      if (editingId) await api.patch(`/catalog/services/${editingId}`, payload);
      else await api.post("/catalog/services", payload);
      await load();
      cancelEdit();
      toast.success(editingId ? "Serviço atualizado." : "Serviço cadastrado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o serviço");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service: Service) {
    try {
      await api.patch(`/catalog/services/${service.id}`, { active: !service.active });
      await load();
      toast.success(service.active ? "Serviço arquivado." : "Serviço reativado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o serviço");
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      const { data } = await api.delete<{ archived: boolean }>(
        `/catalog/services/${removing.id}`,
      );
      await load();
      toast.success(
        data.archived
          ? "Serviço arquivado: ele já tem consultas no histórico."
          : "Serviço excluído.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o serviço");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <Card>
        <CardHeader
          title={editingId ? "Editar serviço" : "Novo serviço"}
          subtitle="A descrição aqui é o padrão da clínica; cada dentista pode escrever a própria."
          icon={<Tags size={18} />}
        />
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Nome do tratamento" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Limpeza e profilaxia"
                required
                minLength={2}
              />
            </Field>
            <Field label="Duração (min)">
              <Input
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                required
              />
            </Field>
            <Field label="Valor (R$)">
              <Input
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="150,00"
                inputMode="decimal"
                required
              />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="min-h-[70px]"
              placeholder="O que está incluso, como é feito e cuidados posteriores."
            />
          </Field>
          <div className="flex justify-end gap-2">
            {editingId ? (
              <button type="button" className={btn.secondary} onClick={cancelEdit}>
                <X size={16} />
                Cancelar
              </button>
            ) : null}
            <button className={btn.primary} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  {editingId ? "Salvar alterações" : "Cadastrar serviço"}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Catálogo"
          subtitle={loading ? undefined : `${items.length} serviço(s)`}
          icon={<Tags size={18} />}
        />
        {loading ? (
          <SkeletonRows rows={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Tags size={28} />}
            title="Nenhum serviço cadastrado"
            description="Cadastre os tipos de tratamento para que a agenda possa ser usada."
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{s.name}</span>
                    {!s.active ? <Badge>Arquivado</Badge> : null}
                  </div>
                  {s.description ? (
                    <p className="mt-0.5 text-sm text-ink-muted">{s.description}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} />
                      {s.durationMin} min
                    </span>
                    <span className="font-medium text-ink-muted">{formatCents(s.priceCents)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={btn.ghostSm}
                    onClick={() => startEdit(s)}
                    title="Editar"
                    aria-label={`Editar ${s.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className={btn.ghostSm}
                    onClick={() => toggleActive(s)}
                    title={s.active ? "Arquivar" : "Reativar"}
                    aria-label={`${s.active ? "Arquivar" : "Reativar"} ${s.name}`}
                  >
                    {s.active ? <Archive size={15} /> : <Undo2 size={15} />}
                  </button>
                  <button
                    type="button"
                    className={btn.ghostSm}
                    onClick={() => setRemoving(s)}
                    title="Excluir"
                    aria-label={`Excluir ${s.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Excluir serviço?"
        description={
          removing
            ? `"${removing.name}" será removido. Se já houver consultas com este serviço, ele apenas será arquivado para preservar o histórico.`
            : undefined
        }
        confirmLabel="Excluir"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
