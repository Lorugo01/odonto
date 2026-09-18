import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  NotebookPen,
  Save,
  Smile,
} from "lucide-react";
import { api } from "../services/api";
import { canSeeClinicalNotes } from "../types";
import { useAuthStore } from "../store/auth";
import { btn } from "../utils/buttonStyles";
import { Odontogram, OdontogramData } from "../components/paciente/odontogram";
import { ClinicalNotes } from "../components/paciente/ClinicalNotes";
import { PatientDocuments } from "../components/paciente/documentos/PatientDocuments";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SkeletonRows,
  StatusBadge,
  Textarea,
  YesNo,
  useToast,
} from "../components/ui";

type Chart = {
  name: string;
  email: string;
  birthDate: string | null;
  chartNumber: string | null;
  maritalStatus: string | null;
  phoneHome: string | null;
  phoneWork: string | null;
  phoneMobile: string | null;
  address: string | null;
  insurance: string | null;
  referredBy: string | null;
  allergyAntibiotic: boolean;
  allergyAnesthetic: boolean;
  allergyDetails: string | null;
  medSensitivity: boolean | null;
  medSensitivityDetails: string | null;
  highBloodPressure: boolean | null;
  highBloodPressureDetails: string | null;
  takingMedication: boolean | null;
  takingMedicationDetails: string | null;
  healthProblems: boolean | null;
  healthProblemsDetails: string | null;
  observations: string | null;
  odontogram: OdontogramData;
  treatmentPlan: string | null;
  planDate: string | null;
};

type PatientAppointment = {
  id: string;
  startsAt: string;
  status: string;
  professional: { name: string };
  service: { name: string };
};

type Tab = "ficha" | "evolucao" | "documentos" | "historico";

const emptyChart: Chart = {
  name: "",
  email: "",
  birthDate: null,
  chartNumber: null,
  maritalStatus: null,
  phoneHome: null,
  phoneWork: null,
  phoneMobile: null,
  address: null,
  insurance: null,
  referredBy: null,
  allergyAntibiotic: false,
  allergyAnesthetic: false,
  allergyDetails: null,
  medSensitivity: null,
  medSensitivityDetails: null,
  highBloodPressure: null,
  highBloodPressureDetails: null,
  takingMedication: null,
  takingMedicationDetails: null,
  healthProblems: null,
  healthProblemsDetails: null,
  observations: null,
  odontogram: {},
  treatmentPlan: null,
  planDate: null,
};

const ANAMNESIS_ITEMS = [
  ["medSensitivity", "medSensitivityDetails", "Sensibilidade a algum medicamento?"],
  ["highBloodPressure", "highBloodPressureDetails", "Sua pressão sanguínea é alta?"],
  ["takingMedication", "takingMedicationDetails", "Está tomando algum medicamento?"],
  ["healthProblems", "healthProblemsDetails", "Tem algum problema de saúde? Qual?"],
] as const;

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function PacienteDetalhe() {
  const { id } = useParams();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const showNotes = canSeeClinicalNotes(user);

  const [chart, setChart] = useState<Chart>(emptyChart);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("ficha");

  const tabs = useMemo(
    () => [
      { id: "ficha" as Tab, label: "Ficha clínica", icon: <ClipboardList size={15} /> },
      ...(showNotes
        ? [{ id: "evolucao" as Tab, label: "Evolução", icon: <NotebookPen size={15} /> }]
        : []),
      { id: "documentos" as Tab, label: "Documentos", icon: <FileText size={15} /> },
      { id: "historico" as Tab, label: "Histórico", icon: <CalendarDays size={15} /> },
    ],
    [showNotes],
  );

  async function load() {
    const res = await api.get<{
      chart: Chart;
      appointments: PatientAppointment[];
    }>(`/patients/${id}`);
    setChart({ ...emptyChart, ...res.data.chart, odontogram: res.data.chart?.odontogram ?? {} });
    setAppointments(res.data.appointments ?? []);
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar ficha"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch<Chart>(`/patients/${id}/chart`, chart);
      setChart({ ...emptyChart, ...data, odontogram: data.odontogram ?? {} });
      toast.success("Ficha salva.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a ficha");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof Chart>(key: K, value: Chart[K]) {
    setChart((c) => ({ ...c, [key]: value }));
  }

  if (loading) return <SkeletonRows rows={6} />;
  if (error && !chart.name) return <ErrorState message={error} />;

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/pacientes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <ArrowLeft size={15} />
          Pacientes
        </Link>
        <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1 shadow-card">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-white"
                  : "text-ink-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "evolucao" && showNotes && id ? (
        <ClinicalNotes patientProfileId={id} appointments={appointments} />
      ) : null}

      {tab === "documentos" && id ? (
        <PatientDocuments patientProfileId={id} appointments={appointments} />
      ) : null}

      {tab === "historico" ? (
        <Card>
          <CardHeader
            title="Consultas"
            subtitle={`${appointments.length} registro(s)`}
            icon={<CalendarDays size={18} />}
          />
          {appointments.length === 0 ? (
            <EmptyState icon={<CalendarDays size={26} />} title="Sem consultas" />
          ) : (
            <ul className="divide-y divide-line">
              {appointments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="font-medium tabular-nums text-ink">
                    {dateTimeFmt.format(new Date(a.startsAt))}
                  </span>
                  <span className="text-ink-muted">{a.service.name}</span>
                  <span className="text-ink-soft">{a.professional.name}</span>
                  <StatusBadge status={a.status} className="ml-auto" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "ficha" ? (
        <form onSubmit={save} className="flex flex-col gap-4">
          <Card>
            <div className="relative mb-4 text-center">
              <p className="text-lg font-bold text-ink">Ficha do paciente</p>
              <p className="text-sm text-ink-muted">Cirurgião-Dentista · Clínica</p>
              <div className="mt-2 inline-flex items-center gap-1 text-sm text-ink-muted sm:absolute sm:right-0 sm:top-0 sm:mt-0">
                Nº
                <input
                  className="w-20 border-b border-line bg-transparent px-1 text-center text-ink focus:border-primary focus:outline-none"
                  value={chart.chartNumber ?? ""}
                  onChange={(e) => set("chartNumber", e.target.value || null)}
                  aria-label="Número da ficha"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nome" className="sm:col-span-2 lg:col-span-3">
                <Input value={chart.name} onChange={(e) => set("name", e.target.value)} required />
              </Field>
              <Field label="Data de nasc.">
                <Input
                  type="date"
                  value={chart.birthDate ?? ""}
                  onChange={(e) => set("birthDate", e.target.value || null)}
                />
              </Field>
              <Field label="Est. civil">
                <Input
                  value={chart.maritalStatus ?? ""}
                  onChange={(e) => set("maritalStatus", e.target.value || null)}
                />
              </Field>
              <Field label="Tel. residencial">
                <Input
                  value={chart.phoneHome ?? ""}
                  onChange={(e) => set("phoneHome", e.target.value || null)}
                />
              </Field>
              <Field label="Tel. com.">
                <Input
                  value={chart.phoneWork ?? ""}
                  onChange={(e) => set("phoneWork", e.target.value || null)}
                />
              </Field>
              <Field label="Cel.">
                <Input
                  value={chart.phoneMobile ?? ""}
                  onChange={(e) => set("phoneMobile", e.target.value || null)}
                />
              </Field>
              <Field label="E-mail">
                <Input value={chart.email} disabled />
              </Field>
              <Field label="Endereço" className="sm:col-span-2 lg:col-span-3">
                <Input
                  value={chart.address ?? ""}
                  onChange={(e) => set("address", e.target.value || null)}
                />
              </Field>
              <Field label="Convênio">
                <Input
                  value={chart.insurance ?? ""}
                  onChange={(e) => set("insurance", e.target.value || null)}
                />
              </Field>
              <Field label="Indicado por" className="sm:col-span-2">
                <Input
                  value={chart.referredBy ?? ""}
                  onChange={(e) => set("referredBy", e.target.value || null)}
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader title="Anamnese" icon={<ClipboardList size={18} />} className="mb-0" />

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Alergia</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-ink">
                  <input
                    type="checkbox"
                    checked={chart.allergyAntibiotic}
                    onChange={(e) => set("allergyAntibiotic", e.target.checked)}
                  />
                  Antibiótico
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-ink">
                  <input
                    type="checkbox"
                    checked={chart.allergyAnesthetic}
                    onChange={(e) => set("allergyAnesthetic", e.target.checked)}
                  />
                  Anestésico
                </label>
              </div>
              <Input
                placeholder="Qual(ais)?"
                value={chart.allergyDetails ?? ""}
                onChange={(e) => set("allergyDetails", e.target.value || null)}
              />
            </div>

            {ANAMNESIS_ITEMS.map(([boolKey, detailKey, label]) => (
              <div key={boolKey} className="space-y-2">
                <p className="text-sm font-medium text-ink">{label}</p>
                <YesNo name={boolKey} value={chart[boolKey]} onChange={(v) => set(boolKey, v)} />
                <Input
                  placeholder="Detalhes"
                  value={chart[detailKey] ?? ""}
                  onChange={(e) => set(detailKey, e.target.value || null)}
                />
              </div>
            ))}

            <Field label="Observações">
              <Textarea
                className="min-h-[80px]"
                value={chart.observations ?? ""}
                onChange={(e) => set("observations", e.target.value || null)}
              />
            </Field>
          </Card>

          <Card className="space-y-3">
            <CardHeader
              title="Odontograma"
              subtitle="Numeração FDI. Marque status por dente ou por face e salve a ficha para persistir."
              icon={<Smile size={18} />}
              className="mb-0"
            />
            <Odontogram
              value={chart.odontogram}
              onChange={(odontogram) => set("odontogram", odontogram)}
            />
          </Card>

          <Card className="space-y-3">
            <h3 className="text-center font-semibold tracking-wide text-ink">
              PLANO DE TRATAMENTO
            </h3>
            <Textarea
              className="min-h-[160px] font-mono leading-7"
              placeholder="Descreva o plano de tratamento..."
              value={chart.treatmentPlan ?? ""}
              onChange={(e) => set("treatmentPlan", e.target.value || null)}
            />
            <div className="flex justify-end">
              <Field label="Data" className="w-44">
                <Input
                  type="date"
                  value={chart.planDate ?? ""}
                  onChange={(e) => set("planDate", e.target.value || null)}
                />
              </Field>
            </div>
          </Card>

          <div className="sticky bottom-20 flex justify-end gap-2 border-t border-line bg-canvas/90 py-3 backdrop-blur md:bottom-4">
            <button type="submit" className={btn.primaryLg} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar ficha
                </>
              )}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
