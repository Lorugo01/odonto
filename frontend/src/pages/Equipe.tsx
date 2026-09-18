import { FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, Pencil, ShieldCheck, Trash2, UserCog, UserPlus, X } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { btn } from "../utils/buttonStyles";
import { Role, roleLabel } from "../types";
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
  useToast,
} from "../components/ui";

type Member = {
  userId: string;
  name: string;
  email: string;
  roles: Role[];
  cro: string | null;
  specialty: string | null;
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
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  /** Pedido de CRO pendente ao promover alguém a dentista. */
  const [croFor, setCroFor] = useState<{ userId: string; value: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>({
    name: "",
    email: "",
    senha: "",
    cro: "",
    specialty: "",
  });

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
    if (form.roles.length === 0) {
      toast.error("Selecione pelo menos um papel");
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
      await load();
      toast.success("Acesso criado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o acesso");
    } finally {
      setCreating(false);
    }
  }

  async function applyRoles(member: Member, roles: Role[], cro?: string) {
    setSavingId(member.userId);
    try {
      await api.patch(`/team/${member.userId}/roles`, { roles, cro });
      await load();
      setCroFor(null);
      // O próprio usuário pode ter mudado de papel: recarrega a sessão.
      if (member.isSelf) {
        const { data } = await api.get("/auth/me");
        refreshUser(data);
      }
      toast.success("Permissões atualizadas.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar as permissões");
    } finally {
      setSavingId(null);
    }
  }

  function toggleRole(member: Member, role: Role, checked: boolean) {
    const roles = checked ? [...member.roles, role] : member.roles.filter((r) => r !== role);
    if (roles.length === 0) {
      toast.error("O integrante precisa de pelo menos um papel");
      return;
    }
    // Conceder o papel de dentista exige CRO: é quem assina receita e atestado.
    if (role === "DENTIST" && checked && !member.cro) {
      setCroFor({ userId: member.userId, value: "" });
      return;
    }
    void applyRoles(member, roles);
  }

  function startEdit(member: Member) {
    setEditingId(member.userId);
    setDraft(draftFrom(member));
    setCroFor(null);
  }

  async function saveProfile(member: Member) {
    if (savingId) return;
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (name.length < 2) {
      toast.error("Informe o nome completo");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    const isDentist = member.roles.includes("DENTIST");
    if (isDentist && draft.cro.trim() === "") {
      toast.error("O CRO é obrigatório para quem atende como dentista");
      return;
    }

    setSavingId(member.userId);
    try {
      await api.patch(`/team/${member.userId}`, {
        name,
        email,
        senha: draft.senha.trim() || undefined,
        cro: isDentist || draft.cro.trim() ? draft.cro.trim() : undefined,
        specialty: isDentist ? draft.specialty.trim() : undefined,
      });
      await load();
      setEditingId(null);
      if (member.isSelf) {
        const { data } = await api.get("/auth/me");
        refreshUser(data);
      }
      toast.success("Perfil atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o perfil");
    } finally {
      setSavingId(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await api.delete(`/team/${removing.userId}`);
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

      <Card>
        <CardHeader
          title="Novo acesso"
          subtitle="Os papéis se somam: marque mais de um para acumular permissões."
          icon={<UserPlus size={18} />}
        />
        <form onSubmit={create} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Nome">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                minLength={2}
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
          </div>

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

          <div className="flex justify-end">
            <button className={btn.primary} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Criar acesso
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Equipe da clínica"
          subtitle={loading ? undefined : `${items.length} acesso(s)`}
          icon={<UserCog size={18} />}
        />
        {loading ? (
          <SkeletonRows rows={3} />
        ) : items.length === 0 ? (
          <EmptyState icon={<UserCog size={28} />} title="Nenhum acesso cadastrado" />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((m) => (
              <li key={m.userId} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{m.name}</span>
                      {m.isSelf ? <Badge tone="primary">Você</Badge> : null}
                      {m.cro ? <Badge>CRO {m.cro}</Badge> : null}
                      {m.specialty ? <Badge tone="neutral">{m.specialty}</Badge> : null}
                    </div>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-muted">
                      <Mail size={12} />
                      {m.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className={btn.secondarySm}
                      onClick={() =>
                        editingId === m.userId ? setEditingId(null) : startEdit(m)
                      }
                      disabled={savingId === m.userId}
                    >
                      {editingId === m.userId ? <X size={14} /> : <Pencil size={14} />}
                      {editingId === m.userId ? "Fechar" : "Editar"}
                    </button>
                    {!m.isSelf ? (
                      <button
                        type="button"
                        className={btn.dangerSm}
                        onClick={() => setRemoving(m)}
                        disabled={savingId === m.userId}
                      >
                        <Trash2 size={14} />
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {STAFF_ROLES.map((role) => (
                    <RoleToggle
                      key={role}
                      role={role}
                      checked={m.roles.includes(role)}
                      // O admin não pode retirar o próprio acesso e se trancar fora.
                      disabled={
                        savingId === m.userId || (m.isSelf && role === "CLINIC_ADMIN")
                      }
                      onChange={(checked) => toggleRole(m, role, checked)}
                    />
                  ))}
                </div>

                {croFor?.userId === m.userId ? (
                  <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-primary/30 bg-primary-soft/40 p-3">
                    <Field
                      label={`CRO de ${m.name}`}
                      className="min-w-[200px] flex-1"
                      hint="Necessário para assinar receitas e atestados."
                    >
                      <Input
                        value={croFor.value}
                        onChange={(e) => setCroFor({ userId: m.userId, value: e.target.value })}
                        placeholder="CRO-SP 12345"
                        autoFocus
                      />
                    </Field>
                    <button
                      type="button"
                      className={btn.primary}
                      disabled={savingId === m.userId || croFor.value.trim() === ""}
                      onClick={() =>
                        applyRoles(m, [...m.roles, "DENTIST"], croFor.value.trim())
                      }
                    >
                      Conceder
                    </button>
                    <button
                      type="button"
                      className={btn.secondary}
                      onClick={() => setCroFor(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null}

                {editingId === m.userId ? (
                  <form
                    className="mt-3 rounded-lg border border-line bg-canvas p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveProfile(m);
                    }}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Nome">
                        <Input
                          value={draft.name}
                          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                          required
                          minLength={2}
                          autoFocus
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
                      <Field label="Nova senha" hint="Deixe em branco para manter a atual.">
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
                    {m.roles.includes("DENTIST") ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="CRO" hint="Usado na assinatura de receitas e atestados.">
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
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, specialty: e.target.value }))
                            }
                            placeholder="Ortodontia"
                          />
                        </Field>
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        className={btn.secondary}
                        onClick={() => setEditingId(null)}
                        disabled={savingId === m.userId}
                      >
                        Cancelar
                      </button>
                      <button className={btn.primary} disabled={savingId === m.userId}>
                        {savingId === m.userId ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar perfil"
                        )}
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-ink-soft">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        Toda alteração de permissão fica registrada no log de auditoria da clínica.
      </p>

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
