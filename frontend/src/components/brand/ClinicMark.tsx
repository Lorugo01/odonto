/** Marca da clínica: logomarca ou inicial, usada no menu e no login. */
export function ClinicMark({
  name,
  logoUrl,
  size = 36,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const letter = name.trim()[0]?.toUpperCase() || "C";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-lg object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg bg-primary font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.42) }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
