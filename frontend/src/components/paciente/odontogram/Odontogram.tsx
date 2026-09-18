import { useMemo, useState } from "react";
import {
  Odontogram as LibOdontogram,
  type ToothConditionGroup,
  type ToothDetail,
} from "react-odontogram";
import "react-odontogram/style.css";
import "./odontogram-lib.css";
import { ConfirmDialog, Textarea } from "../../ui";
import { SurfaceChart } from "./SurfaceChart";
import {
  clearAll,
  clearTooth,
  countFindings,
  Dentition,
  hasFindings,
  NOTE_MAX_LENGTH,
  normalizeChart,
  OdontogramData,
  OdontogramInput,
  setSurfaceStatus,
  setToothNote,
  setToothStatus,
  statusById,
  Surface,
  SURFACE_LABELS,
  surfacesFor,
  TOOTH_STATUSES,
  ToothStatusId,
  toothState,
} from "./model";

type Props = {
  value: OdontogramInput;
  onChange: (next: OdontogramData) => void;
};

const chip = "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors";
const chipIdle = "border-line bg-surface text-ink-muted hover:border-primary/40 hover:text-ink";

function toothId(fdi: number | string) {
  return `teeth-${fdi}`;
}

function fdiFromDetail(t: ToothDetail): number | null {
  const n = Number(t.notations?.fdi ?? t.id.replace("teeth-", ""));
  return Number.isFinite(n) ? n : null;
}

/** Agrupa dentes por status dominante (dente inteiro ou primeira face marcada). */
function buildConditions(data: OdontogramData): ToothConditionGroup[] {
  const byStatus = new Map<ToothStatusId, string[]>();

  for (const [key, state] of Object.entries(data.teeth ?? {})) {
    if (!hasFindings(state)) continue;
    let status = state.status;
    if (!status && state.surfaces) {
      status = Object.values(state.surfaces)[0];
    }
    if (!status) continue;
    const list = byStatus.get(status) ?? [];
    list.push(toothId(key));
    byStatus.set(status, list);
  }

  return TOOTH_STATUSES.filter((s) => byStatus.has(s.id)).map((s) => ({
    label: s.label,
    teeth: byStatus.get(s.id)!,
    fillColor: s.color,
    outlineColor: s.color,
  }));
}

/**
 * Odontograma baseado em `react-odontogram` (silhuetas anatômicas SVG)
 * + editor de faces próprio no painel do dente selecionado.
 */
export function Odontogram({ value, onChange }: Props) {
  const data = useMemo(() => normalizeChart(value), [value]);
  const [tool, setTool] = useState<ToothStatusId>("carie");
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState<"circle" | "square">("square");
  const [confirmClear, setConfirmClear] = useState(false);

  const activeStatus = statusById(tool)!;
  const findings = countFindings(data);
  const selectedState = selected ? toothState(data, selected) : null;
  const conditions = useMemo(() => buildConditions(data), [data]);
  const maxTeeth = dentition === "permanent" ? 8 : 5;

  function applySurface(tooth: number, surface: Surface) {
    setSelected(tooth);
    if (activeStatus.scope === "tooth") {
      onChange(setToothStatus(data, tooth, tool));
      return;
    }
    onChange(setSurfaceStatus(data, tooth, surface, tool));
  }

  function onLibSelect(teeth: ToothDetail[]) {
    if (teeth.length === 0) {
      setSelected(null);
      return;
    }
    const fdi = fdiFromDetail(teeth[0]);
    if (fdi == null) return;
    setSelected(fdi);
    if (activeStatus.scope === "tooth") {
      onChange(setToothStatus(data, fdi, tool));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Clique no dente para selecionar
        {activeStatus.scope === "tooth"
          ? ` e aplicar "${activeStatus.label}".`
          : "; marque as faces no painel abaixo."}
      </p>

      {/* Chart da biblioteca — silhuetas reais */}
      <div className="odontogram-lib overflow-x-auto rounded-xl border border-line bg-canvas p-2 sm:p-4">
        <LibOdontogram
          key={`${dentition}-${layout}`}
          theme="light"
          notation="FDI"
          layout={layout}
          maxTeeth={maxTeeth}
          singleSelect
          defaultSelected={selected != null ? [toothId(selected)] : []}
          onChange={onLibSelect}
          teethConditions={conditions}
          showLabels={conditions.length > 0}
          showTooltip
          colors={{
            darkBlue: "#0D9488",
            baseBlue: "#5EEAD4",
            lightBlue: "#CCFBF1",
          }}
          className="mx-auto max-w-full"
          styles={{ width: "100%", maxWidth: layout === "circle" ? 420 : 920 }}
        />
      </div>

      {/* Ferramentas logo abaixo do desenho, junto do painel do dente */}
      <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Ferramenta</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {TOOTH_STATUSES.map((status) => {
              const active = tool === status.id;
              return (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setTool(status.id)}
                  className={`${chip} inline-flex items-center gap-1.5 ${
                    active ? "border-transparent font-semibold text-white" : chipIdle
                  }`}
                  style={active ? { backgroundColor: status.color } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: active ? "rgba(255,255,255,0.85)" : status.color }}
                  />
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["permanent", "Permanentes"],
                ["deciduous", "Decíduos"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setDentition(id);
                  setSelected(null);
                }}
                className={`${chip} ${
                  dentition === id ? "border-primary bg-primary-soft text-primary" : chipIdle
                }`}
              >
                {label}
              </button>
            ))}
            <span className="mx-1 w-px self-stretch bg-line" />
            {(
              [
                ["square", "Linear"],
                ["circle", "Arcada"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLayout(id)}
                className={`${chip} ${
                  layout === id ? "border-primary bg-primary-soft text-primary" : chipIdle
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">
              {findings === 0
                ? "Nenhum achado"
                : `${findings} ${findings === 1 ? "dente marcado" : "dentes marcados"}`}
            </span>
            {findings > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className={`${chip} border-danger/40 bg-danger-soft text-danger hover:bg-danger/20`}
              >
                Limpar tudo
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {selected && selectedState ? (
        <div className="rounded-xl border border-line bg-canvas p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink">
              Dente {selected}
              {selectedState.status ? (
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  {statusById(selectedState.status)?.label}
                </span>
              ) : null}
            </h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange(clearTooth(data, selected))}
                className={`${chip} ${chipIdle}`}
              >
                Limpar dente
              </button>
              <button type="button" onClick={() => setSelected(null)} className={`${chip} ${chipIdle}`}>
                Fechar
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-ink-muted">Faces</p>
              <SurfaceChart
                tooth={selected}
                state={selectedState}
                onSurfaceClick={(surface) => applySurface(selected, surface)}
                size="md"
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs text-ink-muted">Marcar face com ferramenta ativa</p>
                <div className="flex flex-wrap gap-1.5">
                  {surfacesFor(selected).map((surface) => {
                    const current = selectedState.surfaces?.[surface];
                    const status = statusById(current);
                    return (
                      <button
                        key={surface}
                        type="button"
                        onClick={() => applySurface(selected, surface)}
                        className={`${chip} ${
                          status ? "border-transparent font-semibold text-white" : chipIdle
                        }`}
                        style={status ? { backgroundColor: status.color } : undefined}
                        title={SURFACE_LABELS[surface]}
                      >
                        {surface}
                        {status ? ` · ${status.short}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs text-ink-muted">Status do dente</p>
                <div className="flex flex-wrap gap-1">
                  {TOOTH_STATUSES.filter((s) => s.scope !== "surface").map((status) => {
                    const active = selectedState.status === status.id;
                    return (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => onChange(setToothStatus(data, selected, status.id))}
                        className={`${chip} ${
                          active ? "border-transparent font-semibold text-white" : chipIdle
                        }`}
                        style={active ? { backgroundColor: status.color } : undefined}
                      >
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs text-ink-muted">Observação</span>
                <Textarea
                  rows={2}
                  maxLength={NOTE_MAX_LENGTH}
                  value={selectedState.note ?? ""}
                  onChange={(e) => onChange(setToothNote(data, selected, e.target.value))}
                  placeholder="Ex.: sensibilidade ao frio"
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-soft">
          Selecione um dente no desenho para marcar faces e status.
        </p>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Limpar todo o odontograma?"
        description={`${findings} dente(s) marcado(s) serão descartados. Salve a ficha para confirmar no prontuário.`}
        confirmLabel="Limpar tudo"
        onConfirm={() => {
          onChange(clearAll());
          setSelected(null);
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
