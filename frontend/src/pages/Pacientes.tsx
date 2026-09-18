import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, Search, UserPlus, Users } from "lucide-react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import {
  Card,
  CardHeader,
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

type Patient = { id: string; name: string; email: string; phone: string | null };

export default function Pacientes() {
  const toast = useToast();
  const [items, setItems] = useState<Patient[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get<Patient[]>("/patients");
    setItems(data);
  }

  useEffect(() => {
    load()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar pacientes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // A senha inicial é definida pelo backend; o cliente não trafega credencial.
      await api.post("/patients", { name, email, phone: phone || undefined });
      setName("");
      setEmail("");
      setPhone("");
      await load();
      toast.success("Paciente cadastrado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar o paciente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Novo paciente"
          subtitle="O cadastro já cria a ficha clínica em branco."
          icon={<UserPlus size={18} />}
        />
        <form onSubmit={create} className="grid grid-cols-1 items-end gap-3 md:grid-cols-4">
          <Field label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
              minLength={2}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@email.com"
              required
            />
          </Field>
          <Field label="Celular">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 90000-0000"
            />
          </Field>
          <button className={btn.primary} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Cadastrar
              </>
            )}
          </button>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          className="pl-9"
          aria-label="Buscar paciente"
        />
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={28} />}
            title={items.length === 0 ? "Nenhum paciente cadastrado" : "Nenhum resultado"}
            description={
              items.length === 0
                ? "Use o formulário acima para cadastrar o primeiro paciente."
                : "Ajuste a busca para encontrar o paciente."
            }
          />
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>E-mail</TH>
              <TH className="hidden sm:table-cell">Celular</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {filtered.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">{p.name}</TD>
                <TD className="text-ink-muted">{p.email}</TD>
                <TD className="hidden text-ink-muted sm:table-cell">{p.phone ?? "—"}</TD>
                <TD className="text-right">
                  <Link
                    to={`/pacientes/${p.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    Abrir
                    <ChevronRight size={15} />
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
