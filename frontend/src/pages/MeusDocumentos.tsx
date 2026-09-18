import { useEffect, useState } from "react";
import { ExternalLink, FileText, Printer } from "lucide-react";
import { api } from "../services/api";
import { safeHttpUrl } from "../utils/url";
import { documentPrintPath } from "../utils/documents";
import { documentTypeLabel } from "../components/paciente/documentos/document-types";
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from "../components/ui";

type Doc = {
  id: string;
  title: string;
  type: string;
  url?: string | null;
  createdAt: string;
  authorName?: string | null;
  printable?: boolean;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

export default function MeusDocumentos() {
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Doc[]>("/documents")
      .then((r) => setItems(r.data))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar documentos"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows rows={4} />;
  if (error) return <ErrorState message={error} />;

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText size={28} />}
          title="Nenhum documento"
          description="Receitas, atestados e exames enviados pela clínica aparecem aqui."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((d) => {
        const href = safeHttpUrl(d.url);
        return (
        <Card key={d.id} className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <FileText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">{d.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Badge>{documentTypeLabel(d.type)}</Badge>
              <span className="text-xs text-ink-soft">{dateFmt.format(new Date(d.createdAt))}</span>
              {d.authorName ? (
                <span className="text-xs text-ink-soft">· {d.authorName}</span>
              ) : null}
            </div>
          </div>
          {d.printable ? (
            <a
              href={documentPrintPath(d.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
            >
              <Printer size={14} />
              Ver / imprimir
            </a>
          ) : href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
            >
              Abrir
              <ExternalLink size={14} />
            </a>
          ) : null}
        </Card>
        );
      })}
    </div>
  );
}
