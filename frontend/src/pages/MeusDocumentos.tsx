import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function MeusDocumentos() {
  const [items, setItems] = useState<Array<{ id: string; title: string; type: string; createdAt: string }>>([]);
  useEffect(() => {
    void api.get("/documents").then((r) => setItems(r.data));
  }, []);
  return (
    <div className="flex flex-col gap-2">
      {items.map((d) => (
        <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="font-semibold">{d.title}</div>
          <div className="text-white/50 text-sm">{d.type}</div>
        </div>
      ))}
    </div>
  );
}
