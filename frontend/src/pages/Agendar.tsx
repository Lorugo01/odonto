import { useEffect, useState } from "react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";

type Slot = { startsAt: string; endsAt: string };
type Service = { id: string; name: string };
type Pro = { id: string; name: string };

export default function Agendar() {
  const [services, setServices] = useState<Service[]>([]);
  const [pros, setPros] = useState<Pro[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void Promise.all([api.get<Service[]>("/catalog/services"), api.get<Pro[]>("/catalog/professionals")]).then(
      ([s, p]) => {
        setServices(s.data);
        setPros(p.data);
        if (s.data[0]) setServiceId(s.data[0].id);
        if (p.data[0]) setProfessionalId(p.data[0].id);
      },
    );
  }, []);

  useEffect(() => {
    if (!serviceId || !professionalId || !date) return;
    void api
      .get<Slot[]>(`/availability?professionalId=${professionalId}&serviceId=${serviceId}&date=${date}`)
      .then((r) => setSlots(r.data));
  }, [serviceId, professionalId, date]);

  async function book(startsAt: string) {
    try {
      await api.post("/appointments", { professionalId, serviceId, startsAt });
      setMsg("Consulta agendada.");
      const { data } = await api.get<Slot[]>(
        `/availability?professionalId=${professionalId}&serviceId=${serviceId}&date=${date}`,
      );
      setSlots(data);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <button key={s.id} className={serviceId === s.id ? btn.primary : btn.secondary} onClick={() => setServiceId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pros.map((p) => (
          <button
            key={p.id}
            className={professionalId === p.id ? btn.primary : btn.secondary}
            onClick={() => setProfessionalId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((n) => {
          const d = new Date();
          d.setDate(d.getDate() + n);
          const iso = d.toISOString().slice(0, 10);
          return (
            <button key={iso} className={date === iso ? btn.primary : btn.secondary} onClick={() => setDate(iso)}>
              {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
            </button>
          );
        })}
      </div>
      {msg ? <p className="text-primary">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button key={s.startsAt} className={btn.secondary} onClick={() => book(s.startsAt)}>
            {new Date(s.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </button>
        ))}
      </div>
    </div>
  );
}
