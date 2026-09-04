import {
  isRightSide,
  statusById,
  statusColor,
  Surface,
  SURFACE_LABELS,
  surfacesFor,
  ToothState,
} from "./model";

type Arch = "upper" | "lower";

type Props = {
  tooth: number;
  state: ToothState;
  onSurfaceClick: (surface: Surface) => void;
  size?: "sm" | "md";
};

/** Vista oclusal/incisal: 5 faces (padrão de ficha clínica). */
const OUT = { x: 1.5, y: 1.5, size: 37 };
const IN = { x: 12.5, y: 12.5, size: 15 };

const ZONES = {
  center: `M${IN.x} ${IN.y}h${IN.size}v${IN.size}h-${IN.size}z`,
  top: `M${OUT.x} ${OUT.y}H${OUT.x + OUT.size}L${IN.x + IN.size} ${IN.y}H${IN.x}z`,
  bottom: `M${OUT.x} ${OUT.y + OUT.size}H${OUT.x + OUT.size}L${IN.x + IN.size} ${IN.y + IN.size}H${IN.x}z`,
  left: `M${OUT.x} ${OUT.y}V${OUT.y + OUT.size}L${IN.x} ${IN.y + IN.size}V${IN.y}z`,
  right: `M${OUT.x + OUT.size} ${OUT.y}V${OUT.y + OUT.size}L${IN.x + IN.size} ${IN.y + IN.size}V${IN.y}z`,
} as const;

type Zone = keyof typeof ZONES;
const ZONE_ORDER: Zone[] = ["top", "bottom", "left", "right", "center"];

function zoneMap(tooth: number): Record<Zone, Surface> {
  const arch: Arch = Math.floor(tooth / 10) === 1 || Math.floor(tooth / 10) === 2 || Math.floor(tooth / 10) === 5 || Math.floor(tooth / 10) === 6
    ? "upper"
    : "lower";
  const [central] = surfacesFor(tooth);
  const vestibular: Zone = arch === "upper" ? "top" : "bottom";
  const lingual: Zone = arch === "upper" ? "bottom" : "top";
  const mesial: Zone = isRightSide(tooth) ? "right" : "left";
  const distal: Zone = mesial === "right" ? "left" : "right";

  return {
    center: central,
    [vestibular]: "V",
    [lingual]: "L",
    [mesial]: "M",
    [distal]: "D",
  } as Record<Zone, Surface>;
}

export function SurfaceChart({ tooth, state, onSurfaceClick, size = "md" }: Props) {
  const map = zoneMap(tooth);
  const surfaces = state.surfaces ?? {};
  const dimmed = state.status === "ausente";
  const crossed = state.status === "ausente" || state.status === "extracao_indicada";

  return (
    <svg
      viewBox="0 0 40 40"
      className={size === "sm" ? "w-9 h-9" : "w-16 h-16"}
      role="img"
      aria-label={`Faces do dente ${tooth}`}
    >
      <g opacity={dimmed ? 0.35 : 1}>
        {ZONE_ORDER.map((zone) => {
          const surface = map[zone];
          const marked = surfaces[surface];
          return (
            <path
              key={zone}
              d={ZONES[zone]}
              fill={marked ? statusColor(marked) : "rgba(255,255,255,0.08)"}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={0.9}
              className="cursor-pointer transition-opacity hover:opacity-75"
              onClick={(e) => {
                e.stopPropagation();
                onSurfaceClick(surface);
              }}
            >
              <title>
                {`${SURFACE_LABELS[surface]}${marked ? ` · ${statusById(marked)?.label}` : ""}`}
              </title>
            </path>
          );
        })}
      </g>

      {crossed ? (
        <g stroke={statusColor(state.status)} strokeWidth={2.4} strokeLinecap="round" pointerEvents="none">
          <line x1={6} y1={6} x2={34} y2={34} />
          <line x1={34} y1={6} x2={6} y2={34} />
        </g>
      ) : null}
    </svg>
  );
}
