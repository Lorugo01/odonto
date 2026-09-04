import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { Appointment, statusLabel } from "../types";
import { btn } from "../utils/buttonStyles";

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : true,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export default function Agenda() {
  const wide = useMediaQuery("(min-width: 768px)");
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [items, setItems] = useState<Appointment[]>([]);

  const range = useMemo(() => {
    const from = new Date(anchor);
    const to = addDays(anchor, wide ? 6 : 0);
    to.setHours(23, 59, 59, 999);
    return { from, to, days: wide ? 7 : 1 };
  }, [anchor, wide]);

  async function load() {
    const { data } = await api.get<Appointment[]>(
      `/appointments?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
    );
    setItems(data);
  }

  useEffect(() => {
    void load();
  }, [range.from.toISOString(), range.to.toISOString()]);

  async function setStatus(id: string, status: string) {
    await api.patch(`/appointments/${id}`, { status });
    await load();
  }

  const days = Array.from({ length: range.days }).map((_, i) => addDays(range.from, i));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <button className={btn.secondary} onClick={() => setAnchor(addDays(anchor, wide ? -7 : -1))}>
          Anterior
        </button>
        <div className="font-semibold capitalize text-center px-2">
          {wide
            ? `${range.from.toLocaleDateString("pt-BR")} – ${range.to.toLocaleDateString("pt-BR")}`
            : range.from.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}
        </div>
        <button className={btn.secondary} onClick={() => setAnchor(addDays(anchor, wide ? 7 : 1))}>
          Próximo
        </button>
      </div>
      <div className={`grid gap-3 ${wide ? "grid-cols-7" : "grid-cols-1"}`}>
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const dayItems = items.filter((a) => a.startsAt.slice(0, 10) === key);
          return (
            <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-3 min-h-[140px]">
              <div className="text-xs text-white/50 mb-2">
                {day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
              </div>
              {dayItems.map((a) => (
                <div key={a.id} className="text-sm mb-3">
                  <div className="font-semibold">
                    {new Date(a.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {a.patient?.name}
                  </div>
                  <div className="text-white/50">{statusLabel[a.status]}</div>
                  <div className="flex gap-2 mt-1">
                    {a.status === "SCHEDULED" ? (
                      <button className={btn.successSm} onClick={() => setStatus(a.id, "CONFIRMED")}>
                        Confirmar
                      </button>
                    ) : null}
                    {a.status !== "CANCELLED" ? (
                      <button className={btn.dangerSm} onClick={() => setStatus(a.id, "NO_SHOW")}>
                        Falta
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
