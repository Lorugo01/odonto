import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Appointment, statusLabel } from "../types";
import { btn } from "../utils/buttonStyles";

export default function Consultas() {
  const [items, setItems] = useState<Appointment[]>([]);
  async function load() {
    const from = new Date();
    from.setMonth(from.getMonth() - 2);
    const to = new Date();
    to.setMonth(to.getMonth() + 4);
    const { data } = await api.get<Appointment[]>(
      `/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
    );
    setItems(data);
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {items.map((a) => (
        <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="font-semibold">{new Date(a.startsAt).toLocaleString("pt-BR")}</div>
          <div className="text-white/50 text-sm">
            {a.service.name} · {a.professional.name} · {statusLabel[a.status]}
          </div>
          {a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
            <button
              className={`${btn.dangerSm} mt-2`}
              onClick={async () => {
                await api.patch(`/appointments/${a.id}`, { status: "CANCELLED" });
                await load();
              }}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
