import { FormEvent, useEffect, useState } from "react";
import { ChevronRight, Loader2, Plus, Stethoscope, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { btn } from "../utils/buttonStyles";
import { canManageCatalog } from "../types";
import { centsToInput, formatCents, parseCents } from "../utils/money";
import {
  Badge,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  SkeletonRows,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
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
  catalogActive: boolean;
  catalog: { description: string | null; durationMin: number; priceCents: number };
  own: { description: string | null; durationMin: number | null; priceCents: number | null } | null;
  customized: boolean;
};

type ListResponse = {
  professional: { id: string; name: string } | null;
  treatments: Treatment[];
};

type Pro = { id: string; name: string; specialty?: string | null };

type CatalogDraft = {
  name: string;
  description: string;
  durationMin: string;
  price: string;
  catalogActive: boolean;
};

type OfferDraft = {
  offered: boolean;
  description: string;
  durationMin: string;
  price: string;
};

const emptyCatalog: CatalogDraft = {
  name: "",
  description: "",
  durationMin: "30",
  price: "",
  catalogActive: true,
};

const emptyOffer: OfferDraft = {
  offered: true,
  description: "",
  durationMin: "",
  price: "",
};

/**
 * Catálogo da clínica e oferta de cada dentista na mesma tela: tabela para
 * varrer, popup para detalhar e outro popup para cadastrar.
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

  const [creatingOpen, setCreatingOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState<CatalogDraft>(emptyCatalog);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>(emptyCatalog);
  const [offerDraft, setOfferDraft] = useState<OfferDraft>(emptyOffer);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Treatment | null>(null);

  const selected = data?.treatments.find((t) => t.serviceId === selectedId) ?? null;
  const hasProfessional = Boolean(data?.professional);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<Pro[]>("/catalog/professionals")
      .then((r) => setPros(r.data))
      .catch(() => setPros([]));
  }, [isAdmin]);

  async function load(target: string) {
    const params = new URLSearchParams();
    if (target) params.set("professionalId", target);
    if (isAdmin) params.set("includeInactive", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
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
    // A troca de profissional recarrega a tabela; isAdmin só define o filtro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId]);

  function openCreate() {
    setSelectedId(null);
    setNewForm(emptyCatalog);
    setCreatingOpen(true);
  }

  function openItem(t: Treatment) {
    setCreatingOpen(false);
    setSelectedId(t.serviceId);
    setCatalogDraft({
      name: t.name,
      description: t.catalog.description ?? "",
      durationMin: String(t.catalog.durationMin),
      price: centsToInput(t.catalog.priceCents),
      catalogActive: t.catalogActive !== false,
    });
    setOfferDraft({
      offered: t.active,
      description: t.own?.description ?? "",
      durationMin: t.own?.durationMin != null ? String(t.own.durationMin) : "",
      price: t.own?.priceCents != null ? centsToInput(t.own.priceCents) : "",
    });
  }

  function parseMoney(raw: string, label: string) {
    const priceCents = parseCents(raw);
    if (priceCents === null) {
      toast.error(`Informe um valor válido para ${label}, como 150,00`);
      return null;
    }
    return priceCents;
  }

  function parseDuration(raw: string) {
    const durationMin = Number(raw);
    if (!Number.isInteger(durationMin) || durationMin < 5) {
      toast.error("A duração mínima é de 5 minutos");
      return null;
    }
    return durationMin;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (newForm.name.trim().length < 2) {
      toast.error("Informe o nome do tratamento");
      return;
    }
    const durationMin = parseDuration(newForm.durationMin);
    if (durationMin == null) return;
    const priceCents = parseMoney(newForm.price, "o preço");
    if (priceCents == null) return;

    setCreating(true);
    try {
      const payload = {
        name: newForm.name.trim(),
        description: newForm.description.trim() || undefined,
        durationMin,
        priceCents,
      };
      if (!isAdmin || professionalId || data?.professional) {
        await api.post("/treatments", {
          ...payload,
          professionalId: professionalId || undefined,
        });
      } else {
        await api.post("/catalog/services", payload);
      }
      setCreatingOpen(false);
      setNewForm(emptyCatalog);
      await load(professionalId);
      toast.success("Tratamento cadastrado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar o tratamento");
    } finally {
      setCreating(false);
    }
  }

  async function saveItem() {
    if (!selected || saving) return;
    if (catalogDraft.name.trim().length < 2) {
      toast.error("Informe o nome do tratamento");
      return;
    }
    const catalogDuration = parseDuration(catalogDraft.durationMin);
    if (catalogDuration == null) return;
    const catalogPrice = parseMoney(catalogDraft.price, "o preço do catálogo");
    if (catalogPrice == null) return;

    const ownDurationRaw = offerDraft.durationMin.trim();
    const ownDuration = ownDurationRaw === "" ? null : Number(ownDurationRaw);
    if (ownDuration !== null && (!Number.isInteger(ownDuration) || ownDuration < 5)) {
      toast.error("A duração mínima é de 5 minutos");
      return;
    }
    const ownPriceRaw = offerDraft.price.trim();
    const ownPrice = ownPriceRaw === "" ? null : parseCents(ownPriceRaw);
    if (ownPriceRaw !== "" && ownPrice === null) {
      toast.error("Informe um valor válido, como 150,00");
      return;
    }

    setSaving(true);
    try {
      if (isAdmin) {
        await api.patch(`/catalog/services/${selected.serviceId}`, {
          name: catalogDraft.name.trim(),
          description: catalogDraft.description.trim(),
          durationMin: catalogDuration,
          priceCents: catalogPrice,
          active: catalogDraft.catalogActive,
        });
      }
      if (hasProfessional) {
        await api.put("/treatments", {
          serviceId: selected.serviceId,
          professionalId: professionalId || undefined,
          description: offerDraft.description.trim() || null,
          durationMin: ownDuration,
          priceCents: ownPrice,
          active: offerDraft.offered,
        });
      }
      await load(professionalId);
      setSelectedId(null);
      toast.success("Tratamento atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o tratamento");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      const { data: result } = await api.delete<{ archived: boolean }>(
        `/catalog/services/${removing.serviceId}`,
      );
      if (selectedId === removing.serviceId) setSelectedId(null);
      await load(professionalId);
      toast.success(
        result.archived
          ? "Tratamento arquivado: ele já tem consultas no histórico."
          : "Tratamento excluído.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o tratamento");
    } finally {
      setRemoving(null);
    }
  }

  const items = data?.treatments ?? [];
  const busy = saving || creating;

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 text-primary">
            <Stethoscope size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">Tratamentos</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {loading
                ? "Carregando..."
                : `${items.length} tipo(s) · clique na linha para ver e editar`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && pros.length > 0 ? (
            <Select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-48"
              aria-label="Profissional"
            >
              <option value="">Eu mesmo</option>
              {pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          ) : null}
          <button type="button" className={btn.primary} onClick={openCreate}>
            <Plus size={16} />
            Novo tratamento
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Stethoscope size={28} />}
            title="Nenhum tratamento cadastrado"
            description="Use Novo tratamento para cadastrar o primeiro tipo."
          />
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH className="hidden sm:table-cell">Duração</TH>
              <TH>Valor</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {items.map((t) => (
              <TR key={t.serviceId} onClick={() => openItem(t)}>
                <TD>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    {t.catalogActive === false ? <Badge>Arquivado</Badge> : null}
                    {hasProfessional ? (
                      t.active ? (
                        <Badge tone="success">Atende</Badge>
                      ) : (
                        <Badge>Não atende</Badge>
                      )
                    ) : null}
                  </div>
                  {t.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{t.description}</p>
                  ) : null}
                </TD>
                <TD className="hidden text-ink-muted sm:table-cell">{t.durationMin} min</TD>
                <TD className="text-ink-muted">{formatCents(t.priceCents)}</TD>
                <TD className="text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      openItem(t);
                    }}
                  >
                    Abrir
                    <ChevronRight size={15} />
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog
        open={creatingOpen}
        wide
        title="Novo tratamento"
        subtitle={
          hasProfessional
            ? `Cadastra o tipo e já marca que ${data?.professional?.name} atende.`
            : "Cadastra o tipo no catálogo da clínica."
        }
        icon={<Plus size={18} />}
        onClose={() => !creating && setCreatingOpen(false)}
        footer={
          <>
            <button
              type="button"
              className={btn.secondary}
              onClick={() => setCreatingOpen(false)}
              disabled={creating}
            >
              Cancelar
            </button>
            <button type="submit" form="new-treatment" className={btn.primary} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                "Cadastrar"
              )}
            </button>
          </>
        }
      >
        <form id="new-treatment" className="flex flex-col gap-3 pb-1" onSubmit={create}>
          <Field label="Nome">
            <Input
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Limpeza e profilaxia"
              required
              minLength={2}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Duração (min)">
              <Input
                type="number"
                min={5}
                max={480}
                step={5}
                value={newForm.durationMin}
                onChange={(e) => setNewForm((f) => ({ ...f, durationMin: e.target.value }))}
                required
              />
            </Field>
            <Field label="Valor (R$)">
              <Input
                value={newForm.price}
                onChange={(e) => setNewForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="150,00"
                inputMode="decimal"
                required
              />
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea
              value={newForm.description}
              onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
              className="min-h-[80px]"
              placeholder="O que está incluso e como é feito."
            />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={selected !== null}
        wide
        title={selected?.name ?? "Tratamento"}
        subtitle={
          hasProfessional && data?.professional
            ? `Oferta de ${data.professional.name}`
            : "Catálogo da clínica"
        }
        icon={<Stethoscope size={18} />}
        onClose={() => !saving && setSelectedId(null)}
        footer={
          <>
            {isAdmin && selected ? (
              <button
                type="button"
                className={`${btn.danger} mr-auto`}
                onClick={() => setRemoving(selected)}
                disabled={busy}
              >
                <Trash2 size={16} />
                Excluir
              </button>
            ) : null}
            <button
              type="button"
              className={btn.secondary}
              onClick={() => setSelectedId(null)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="button" className={btn.primary} onClick={() => void saveItem()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </>
        }
      >
        {selected ? (
          <div className="flex flex-col gap-5 pb-1">
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {isAdmin ? "Catálogo da clínica" : "Dados do tratamento"}
              </h3>
              <Field label="Nome">
                <Input
                  value={catalogDraft.name}
                  onChange={(e) => setCatalogDraft((d) => ({ ...d, name: e.target.value }))}
                  disabled={!isAdmin}
                  required
                  minLength={2}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Duração (min)">
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={catalogDraft.durationMin}
                    onChange={(e) => setCatalogDraft((d) => ({ ...d, durationMin: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </Field>
                <Field label="Valor (R$)">
                  <Input
                    value={catalogDraft.price}
                    onChange={(e) => setCatalogDraft((d) => ({ ...d, price: e.target.value }))}
                    disabled={!isAdmin}
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <Field label="Descrição">
                <Textarea
                  value={catalogDraft.description}
                  onChange={(e) => setCatalogDraft((d) => ({ ...d, description: e.target.value }))}
                  disabled={!isAdmin}
                  className="min-h-[80px]"
                />
              </Field>
              {isAdmin ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={catalogDraft.catalogActive}
                    onChange={(e) =>
                      setCatalogDraft((d) => ({ ...d, catalogActive: e.target.checked }))
                    }
                  />
                  Disponível no catálogo da clínica
                </label>
              ) : null}
            </section>

            {hasProfessional ? (
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Como este dentista atende
                </h3>
                <label
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                    offerDraft.offered
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface hover:border-primary/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={offerDraft.offered}
                    onChange={(e) => setOfferDraft((d) => ({ ...d, offered: e.target.checked }))}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${
                        offerDraft.offered ? "text-primary" : "text-ink"
                      }`}
                    >
                      {offerDraft.offered ? "Atende este tratamento" : "Não atende"}
                    </span>
                    <span className="block text-xs leading-snug text-ink-muted">
                      Pacientes só conseguem solicitar o que estiver marcado.
                    </span>
                  </span>
                </label>

                {offerDraft.offered ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label="Duração própria (min)"
                        hint={`Em branco usa ${selected.catalog.durationMin} min do catálogo`}
                      >
                        <Input
                          type="number"
                          min={5}
                          max={480}
                          step={5}
                          value={offerDraft.durationMin}
                          onChange={(e) =>
                            setOfferDraft((d) => ({ ...d, durationMin: e.target.value }))
                          }
                          placeholder={String(selected.catalog.durationMin)}
                        />
                      </Field>
                      <Field
                        label="Valor próprio (R$)"
                        hint={`Em branco usa ${formatCents(selected.catalog.priceCents)}`}
                      >
                        <Input
                          value={offerDraft.price}
                          onChange={(e) =>
                            setOfferDraft((d) => ({ ...d, price: e.target.value }))
                          }
                          placeholder={centsToInput(selected.catalog.priceCents)}
                          inputMode="decimal"
                        />
                      </Field>
                    </div>
                    <Field
                      label="Descrição própria"
                      hint="Em branco usa a descrição do catálogo."
                    >
                      <Textarea
                        value={offerDraft.description}
                        onChange={(e) =>
                          setOfferDraft((d) => ({ ...d, description: e.target.value }))
                        }
                        className="min-h-[80px]"
                        placeholder={
                          selected.catalog.description ??
                          "Explique ao paciente como você realiza este tratamento."
                        }
                      />
                    </Field>
                  </>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Excluir tratamento?"
        description={
          removing
            ? `"${removing.name}" será removido. Se já houver consultas, ele apenas será arquivado para preservar o histórico.`
            : undefined
        }
        confirmLabel="Excluir"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
