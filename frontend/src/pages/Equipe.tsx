import { FormEvent, useEffect, useState } from "react";
import { ChevronRight, Clock, Loader2, ShieldCheck, Trash2, UserCog, UserPlus } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { btn } from "../utils/buttonStyles";
import { Role, roleLabel } from "../types";
import {
  Badge,
  Card,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SkeletonRows,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  useToast,
} from "../components/ui";

type WorkingDay = {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
};

type Member = {
  userId: string;
  professionalId: string | null;
  name: string;
  email: string;
  roles: Role[];
  cro: string | null;
  specialty: string | null;
  hours: WorkingDay[];
  isSelf: boolean;
};

/** Papéis atribuíveis. O papel de paciente é gerenciado em Pacientes. */
const STAFF_ROLES: Role[] = ["CLINIC_ADMIN", "DENTIST", "RECEPTION"];

const ROLE_HINT: Record<string, string> = {
  CLINIC_ADMIN: "Gerencia serviços, equipe e vê toda a agenda",
  DENTIST: "Atende, registra evolução e emite receitas",
  RECEPTION: "Agenda consultas e emite declarações",
};

type NewMember = {
  name: string;
  email: string;
  senha: string;
  roles: Role[];
  cro: string;
  specialty: string;
};

type ProfileDraft = {
  name: string;
  email: string;
  senha: string;
  cro: string;
  specialty: string;
};

function draftFrom(member: Member): ProfileDraft {
  return {
    name: member.name,
    email: member.email,
    senha: "",
    cro: member.cro ?? "",
    specialty: member.specialty ?? "",
  };
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function defaultHours(): WorkingDay[] {
  return WEEKDAYS.map((_, weekday) => ({
    weekday,
    enabled: weekday >= 1 && weekday <= 5,
    start: "08:00",
    end: "18:00",
  }));
}

function hoursFrom(member: Member): WorkingDay[] {
  if (member.hours?.length === 7) return member.hours;
  return defaultHours();
}

function sameRoles(a: Role[], b: Role[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((role, i) => role === right[i]);
}

const emptyMember: NewMember = {
  name: "",
  email: "",
  senha: "",
  roles: ["RECEPTION"],
  cro: "",
  specialty: "",
};

function RoleToggle({
  role,
  checked,
  disabled,
  onChange,
}: {
  role: Role;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${
        checked ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-primary/40"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${checked ? "text-primary" : "text-ink"}`}>
          {roleLabel[role]}
        </span>
        <span className="block text-xs leading-snug text-ink-muted">{ROLE_HINT[role]}</span>
      </span>
    </label>
  );
}

function HoursEditor({
  days,
  onPatch,
}: {
  days: WorkingDay[];
  onPatch: (weekday: number, patch: Partial<WorkingDay>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {days.map((d) => (
        <div
          key={d.weekday}
          className="grid grid-cols-[7.5rem_1fr_1fr] items-center gap-2 sm:grid-cols-[8rem_auto_1fr_1fr]"
        >
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={d.enabled}
              onChange={(e) => onPatch(d.weekday, { enabled: e.target.checked })}
            />
            {WEEKDAYS[d.weekday]}
          </label>
          <span className="hidden text-xs text-ink-soft sm:inline">
            {d.enabled ? "Atende" : "Folga"}
          </span>
          <Input
            type="time"
            value={d.start}
            disabled={!d.enabled}
            onChange={(e) => onPatch(d.weekday, { start: e.target.value })}
            aria-label={`Entrada ${WEEKDAYS[d.weekday]}`}
          />
          <Input
            type="time"
            value={d.end}
            disabled={!d.enabled}
            onChange={(e) => onPatch(d.weekday, { end: e.target.value })}
            aria-label={`Saída ${WEEKDAYS[d.weekday]}`}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Permissões por usuário. Os papéis são acumuláveis: o mesmo acesso pode ser
 * administrador e dentista, ou administrador e recepção.
 */
export default function Equipe() {
  const toast = useToast();
  const refreshUser = useAuthStore((s) => s.setUser);

  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewMember>(emptyMember);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>({
    name: "",
    email: "",
    senha: "",
    cro: "",
    specialty: "",
  });
  const [rolesDraft, setRolesDraft] = useState<Role[]>([]);
  const [hoursDraft, setHoursDraft] = useState<WorkingDay[]>(defaultHours());
  const [savingMember, setSavingMember] = useState(false);

  const selected = items.find((m) => m.userId === selectedId) ?? null;
  const dentistSelected = rolesDraft.includes("DENTIST");

  async function load() {
    const { data } = await api.get<Member[]>("/team");
    setItems(data);
  }

  useEffect(() => {
    load()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar a equipe"))
      .finally(() => setLoading(false));
  }, []);

  function toggleNewRole(role: Role, checked: boolean) {
    setForm((f) => ({
      ...f,
      roles: checked ? [...f.roles, role] : f.roles.filter((r) => r !== role),
    }));
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (form.name.trim().length < 2) {
      toast.error("Informe o nome completo");
      return;
    }
    if (!form.email.trim().includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    if (form.senha.trim().length > 0 && form.senha.trim().length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (form.roles.length === 0) {
      toast.error("Selecione pelo menos um papel");
      return;
    }
    if (form.roles.includes("DENTIST") && form.cro.trim() === "") {
      toast.error("Informe o CRO para conceder o papel de dentista");
      return;
    }
    setCreating(true);
    try {
      await api.post("/team", {
        name: form.name.trim(),
        email: form.email.trim(),
        senha: form.senha || undefined,
        roles: form.roles,
        cro: form.cro.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
      });
      setForm(emptyMember);
      setCreatingOpen(false);
      await load();
      toast.success("Acesso criado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o acesso");
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setSelectedId(null);
    setForm(emptyMember);
    setCreatingOpen(true);
  }

  function openMember(member: Member) {
    setSelectedId(member.userId);
    setDraft(draftFrom(member));
    setRolesDraft(member.roles);
    setHoursDraft(hoursFrom(member));
  }

  function closeMember() {
    if (savingMember) return;
    setSelectedId(null);
  }

  function toggleMemberRole(role: Role, checked: boolean) {
    if (!selected) return;
    const next = checked ? [...rolesDraft, role] : rolesDraft.filter((r) => r !== role);
    if (next.length === 0) {
      toast.error("O integrante precisa de pelo menos um papel");
      return;
    }
    setRolesDraft(next);
  }

  function patchHours(weekday: number, patch: Partial<WorkingDay>) {
    setHoursDraft((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  async function saveMember() {
    if (!selected || savingMember) return;
    const name = draft.name.trim();
    const email = draft.email.trim();
    const cro = draft.cro.trim();
    if (name.length < 2) {
      toast.error("Informe o nome completo");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    if (draft.senha.trim().length > 0 && draft.senha.trim().length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (rolesDraft.length === 0) {
      toast.error("O integrante precisa de pelo menos um papel");
      return;
    }
    if (dentistSelected && !cro) {
      toast.error("O CRO é obrigatório para quem atende como dentista");
      return;
    }

    setSavingMember(true);
    try {
      await api.patch(`/team/${selected.userId}`, {
        name,
        email,
        senha: draft.senha.trim() || undefined,
        cro: dentistSelected || cro ? cro : undefined,
        specialty: dentistSelected ? draft.specialty.trim() : undefined,
      });

      if (!sameRoles(rolesDraft, selected.roles)) {
        await api.patch(`/team/${selected.userId}/roles`, {
          roles: rolesDraft,
          cro: cro || undefined,
        });
      }

      if (dentistSelected) {
        await api.patch(`/team/${selected.userId}/hours`, {
          days: hoursDraft.map((d) => ({
            ...d,
            start: d.start.slice(0, 5),
            end: d.end.slice(0, 5),
          })),
        });
      }

      await load();
      if (selected.isSelf) {
        const { data } = await api.get("/auth/me");
        refreshUser(data);
      }
      setSelectedId(null);
      toast.success("Acesso atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o acesso");
    } finally {
      setSavingMember(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await api.delete(`/team/${removing.userId}`);
      if (selectedId === removing.userId) setSelectedId(null);
      await load();
      toast.success("Acesso removido.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover o acesso");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-primary">
            <UserCog size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Equipe da clínica</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {loading ? "Carregando..." : `${items.length} acesso(s) · clique na linha para cargos e horários`}
            </p>
          </div>
        </div>
        <button type="button" className={btn.primary} onClick={openCreate}>
          <UserPlus size={16} />
          Novo acesso
        </button>
      </div>

      {loading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<UserCog size={28} />} title="Nenhum acesso cadastrado" />
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>E-mail</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {items.map((m) => (
              <TR key={m.userId} onClick={() => openMember(m)}>
                <TD>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {m.isSelf ? <Badge tone="primary">Você</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {m.roles.map((role) => roleLabel[role]).join(" · ")}
                  </p>
                </TD>
                <TD className="text-ink-muted">{m.email}</TD>
                <TD className="text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMember(m);
                    }}
                  >
                    Gerenciar
                    <ChevronRight size={15} />
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <p className="flex items-start gap-1.5 text-xs text-ink-soft">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        Toda alteração de permissão fica registrada no log de auditoria da clínica.
      </p>

      <Dialog
        open={creatingOpen}
        wide
        title="Novo acesso"
        subtitle="Os papéis se somam: marque mais de um para acumular permissões."
        icon={<UserPlus size={18} />}
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
            <button type="submit" form="new-member" className={btn.primary} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar acesso"
              )}
            </button>
          </>
        }
      >
        <form id="new-member" className="flex flex-col gap-3 pb-1" onSubmit={create}>
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              minLength={2}
              autoFocus
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </Field>
          <Field label="Senha inicial" hint="Não é usada se o e-mail já existir.">
            <Input
              type="password"
              value={form.senha}
              onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {STAFF_ROLES.map((role) => (
              <RoleToggle
                key={role}
                role={role}
                checked={form.roles.includes(role)}
                onChange={(checked) => toggleNewRole(role, checked)}
              />
            ))}
          </div>
          {form.roles.includes("DENTIST") ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="CRO" hint="Obrigatório para o dentista assinar documentos.">
                <Input
                  value={form.cro}
                  onChange={(e) => setForm((f) => ({ ...f, cro: e.target.value }))}
                  placeholder="CRO-SP 12345"
                  required
                />
              </Field>
              <Field label="Especialidade">
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder="Ortodontia"
                />
              </Field>
            </div>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={selected !== null}
        wide
        title={selected?.name ?? "Acesso"}
        subtitle={selected ? selected.email : undefined}
        icon={<UserCog size={18} />}
        onClose={closeMember}
        footer={
          <>
            {selected && !selected.isSelf ? (
              <button
                type="button"
                className={`${btn.danger} mr-auto`}
                onClick={() => setRemoving(selected)}
                disabled={savingMember}
              >
                <Trash2 size={16} />
                Remover
              </button>
            ) : null}
            <button type="button" className={btn.secondary} onClick={closeMember} disabled={savingMember}>
              Cancelar
            </button>
            <button type="button" className={btn.primary} onClick={() => void saveMember()} disabled={savingMember}>
              {savingMember ? (
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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cargos</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {STAFF_ROLES.map((role) => (
                  <RoleToggle
                    key={role}
                    role={role}
                    checked={rolesDraft.includes(role)}
                    disabled={savingMember || (selected.isSelf && role === "CLINIC_ADMIN")}
                    onChange={(checked) => toggleMemberRole(role, checked)}
                  />
                ))}
              </div>
              {dentistSelected ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="CRO" hint="Necessário para assinar receitas e atestados.">
                    <Input
                      value={draft.cro}
                      onChange={(e) => setDraft((d) => ({ ...d, cro: e.target.value }))}
                      placeholder="CRO-SP 12345"
                      required
                    />
                  </Field>
                  <Field label="Especialidade">
                    <Input
                      value={draft.specialty}
                      onChange={(e) => setDraft((d) => ({ ...d, specialty: e.target.value }))}
                      placeholder="Ortodontia"
                    />
                  </Field>
                </div>
              ) : null}
            </section>

            {dentistSelected ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-ink-muted">
                  <Clock size={14} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">Dias e horários</h3>
                </div>
                <HoursEditor days={hoursDraft} onPatch={patchHours} />
              </section>
            ) : null}

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Perfil</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nome">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    required
                    minLength={2}
                  />
                </Field>
                <Field label="E-mail">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Nova senha" hint="Deixe em branco para manter a atual." className="sm:col-span-2">
                  <Input
                    type="password"
                    value={draft.senha}
                    onChange={(e) => setDraft((d) => ({ ...d, senha: e.target.value }))}
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                </Field>
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title="Remover acesso?"
        description={
          removing
            ? `${removing.name} perderá o acesso à clínica. O histórico de atendimentos e documentos é preservado.`
            : undefined
        }
        confirmLabel="Remover"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
