import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { statusLabel } from "../types";
import { btn } from "../utils/buttonStyles";
import { Odontogram, OdontogramData } from "../components/paciente/odontogram";

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

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-white/55 text-xs">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-neutral/60 px-3 py-2 text-sm focus:border-primary focus:outline-none";

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <label className="inline-flex items-center gap-1.5 cursor-pointer">
        <input type="radio" checked={value === true} onChange={() => onChange(true)} />
        Sim
      </label>
      <label className="inline-flex items-center gap-1.5 cursor-pointer">
        <input type="radio" checked={value === false} onChange={() => onChange(false)} />
        Não
      </label>
    </div>
  );
}

export default function PacienteDetalhe() {
  const { id } = useParams();
  const [chart, setChart] = useState<Chart>(emptyChart);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"ficha" | "historico">("ficha");

  async function load() {
    const res = await api.get(`/patients/${id}`);
    setChart({ ...emptyChart, ...res.data.chart, odontogram: res.data.chart?.odontogram ?? {} });
    setAppointments(res.data.appointments ?? []);
    setDocuments(res.data.documents ?? []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const { data } = await api.patch(`/patients/${id}/chart`, chart);
      setChart({ ...emptyChart, ...data, odontogram: data.odontogram ?? {} });
      setMsg("Ficha salva.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function addDoc(e: FormEvent) {
    e.preventDefault();
    await api.post("/documents", { patientProfileId: id, title: docTitle, type: "anotacao" });
    setDocTitle("");
    await load();
  }

  function set<K extends keyof Chart>(key: K, value: Chart[K]) {
    setChart((c) => ({ ...c, [key]: value }));
  }

  if (error && !chart.name) return <p className="text-danger">{error}</p>;
  if (!chart.name && !error) return <p className="text-white/50">Carregando ficha...</p>;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/pacientes" className="text-sm text-primary">
          ← Pacientes
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            className={tab === "ficha" ? btn.primary : btn.secondary}
            onClick={() => setTab("ficha")}
          >
            Ficha clínica
          </button>
          <button
            type="button"
            className={tab === "historico" ? btn.primary : btn.secondary}
            onClick={() => setTab("historico")}
          >
            Histórico
          </button>
        </div>
      </div>

      {tab === "historico" ? (
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Consultas</h3>
            {appointments.length === 0 ? <p className="text-white/50 text-sm">Sem consultas.</p> : null}
            {appointments.map((a) => (
              <p key={a.id} className="text-sm py-1">
                {new Date(a.startsAt).toLocaleString("pt-BR")} · {a.service.name} · {statusLabel[a.status]}
              </p>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Documentos</h3>
            {documents.map((d) => (
              <p key={d.id} className="text-sm py-1">
                {d.title} ({d.type})
              </p>
            ))}
            <form onSubmit={addDoc} className="flex flex-col sm:flex-row gap-2 mt-3">
              <input
                className={inputCls}
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Novo documento"
              />
              <button className={btn.primary}>Adicionar</button>
            </form>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="text-center mb-4 relative">
              <p className="text-lg font-bold">Ficha do paciente</p>
              <p className="text-white/50 text-sm">Cirurgião-Dentista · Clínica</p>
              <div className="absolute right-0 top-0 text-sm text-white/60">
                Nº{" "}
                <input
                  className="w-20 border-b border-white/30 bg-transparent px-1 text-center"
                  value={chart.chartNumber ?? ""}
                  onChange={(e) => set("chartNumber", e.target.value || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Nome" className="sm:col-span-2 lg:col-span-3">
                <input className={inputCls} value={chart.name} onChange={(e) => set("name", e.target.value)} required />
              </Field>
              <Field label="Data de nasc.">
                <input
                  type="date"
                  className={inputCls}
                  value={chart.birthDate ?? ""}
                  onChange={(e) => set("birthDate", e.target.value || null)}
                />
              </Field>
              <Field label="Est. civil">
                <input
                  className={inputCls}
                  value={chart.maritalStatus ?? ""}
                  onChange={(e) => set("maritalStatus", e.target.value || null)}
                />
              </Field>
              <Field label="Tel. residencial">
                <input
                  className={inputCls}
                  value={chart.phoneHome ?? ""}
                  onChange={(e) => set("phoneHome", e.target.value || null)}
                />
              </Field>
              <Field label="Tel. com.">
                <input
                  className={inputCls}
                  value={chart.phoneWork ?? ""}
                  onChange={(e) => set("phoneWork", e.target.value || null)}
                />
              </Field>
              <Field label="Cel.">
                <input
                  className={inputCls}
                  value={chart.phoneMobile ?? ""}
                  onChange={(e) => set("phoneMobile", e.target.value || null)}
                />
              </Field>
              <Field label="E-mail">
                <input className={inputCls} value={chart.email} disabled />
              </Field>
              <Field label="Endereço" className="sm:col-span-2 lg:col-span-3">
                <input
                  className={inputCls}
                  value={chart.address ?? ""}
                  onChange={(e) => set("address", e.target.value || null)}
                />
              </Field>
              <Field label="Convênio">
                <input
                  className={inputCls}
                  value={chart.insurance ?? ""}
                  onChange={(e) => set("insurance", e.target.value || null)}
                />
              </Field>
              <Field label="Indicado por" className="sm:col-span-2">
                <input
                  className={inputCls}
                  value={chart.referredBy ?? ""}
                  onChange={(e) => set("referredBy", e.target.value || null)}
                />
              </Field>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold">Anamnese</h3>

            <div className="space-y-2">
              <p className="text-sm text-white/70">Alergia</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={chart.allergyAntibiotic}
                    onChange={(e) => set("allergyAntibiotic", e.target.checked)}
                  />
                  Antibiótico
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={chart.allergyAnesthetic}
                    onChange={(e) => set("allergyAnesthetic", e.target.checked)}
                  />
                  Anestésico
                </label>
              </div>
              <input
                className={inputCls}
                placeholder="Qual(ais)?"
                value={chart.allergyDetails ?? ""}
                onChange={(e) => set("allergyDetails", e.target.value || null)}
              />
            </div>

            {(
              [
                ["medSensitivity", "medSensitivityDetails", "Sensibilidade a algum medicamento?"],
                ["highBloodPressure", "highBloodPressureDetails", "Sua pressão sanguínea é alta?"],
                ["takingMedication", "takingMedicationDetails", "Está tomando algum medicamento?"],
                ["healthProblems", "healthProblemsDetails", "Tem algum problema de saúde? Qual?"],
              ] as const
            ).map(([boolKey, detailKey, label]) => (
              <div key={boolKey} className="space-y-2">
                <p className="text-sm text-white/70">{label}</p>
                <YesNo value={chart[boolKey]} onChange={(v) => set(boolKey, v)} />
                <input
                  className={inputCls}
                  placeholder="Detalhes"
                  value={chart[detailKey] ?? ""}
                  onChange={(e) => set(detailKey, e.target.value || null)}
                />
              </div>
            ))}

            <Field label="Observações">
              <textarea
                className={`${inputCls} min-h-[80px]`}
                value={chart.observations ?? ""}
                onChange={(e) => set("observations", e.target.value || null)}
              />
            </Field>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 space-y-3">
            <div>
              <h3 className="font-semibold">Odontograma</h3>
              <p className="text-xs text-white/45 mt-1">
                Numeração FDI · desenho anatômico (react-odontogram) + faces no painel. Salve a ficha para
              persistir.
              </p>
            </div>
            <Odontogram
              value={chart.odontogram}
              onChange={(odontogram) => set("odontogram", odontogram)}
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 space-y-3">
            <h3 className="font-semibold text-center tracking-wide">PLANO DE TRATAMENTO</h3>
            <textarea
              className={`${inputCls} min-h-[160px] font-mono text-sm leading-7`}
              placeholder="Descreva o plano de tratamento..."
              value={chart.treatmentPlan ?? ""}
              onChange={(e) => set("treatmentPlan", e.target.value || null)}
            />
            <div className="flex justify-end">
              <Field label="Data" className="w-44">
                <input
                  type="date"
                  className={inputCls}
                  value={chart.planDate ?? ""}
                  onChange={(e) => set("planDate", e.target.value || null)}
                />
              </Field>
            </div>
          </div>

          {msg ? <p className="text-primary text-sm">{msg}</p> : null}
          {error ? <p className="text-danger text-sm">{error}</p> : null}

          <div className="flex justify-end gap-2 sticky bottom-20 md:bottom-4 bg-neutral/90 py-3 border-t border-white/5">
            <button type="submit" className={btn.primaryLg} disabled={saving}>
              {saving ? "Salvando..." : "Salvar ficha"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
