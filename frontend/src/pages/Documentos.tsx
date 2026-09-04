import { useEffect, useState } from "react";
import { api } from "../services/api";

type Doc = { id: string; title: string; type: string; createdAt: string; patientName?: string };

export default function Documentos() {
  const [items, setItems] = useState<Doc[]>([]);
  useEffect(() => {
    void api.get<Doc[]>("/documents").then((r) => setItems(r.data));
  }, []);
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-white/60">
          <tr>
            <th className="text-left p-3">Título</th>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Paciente</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <tr key={d.id} className="border-t border-white/5">
              <td className="p-3">{d.title}</td>
              <td className="p-3">{d.type}</td>
              <td className="p-3">{d.patientName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
