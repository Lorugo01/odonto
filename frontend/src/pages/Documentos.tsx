import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Printer, Search } from "lucide-react";
import { api } from "../services/api";
import { safeHttpUrl } from "../utils/url";
import { documentPrintPath } from "../utils/documents";
import { documentTypeLabel } from "../components/paciente/documentos/document-types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  SkeletonRows,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "../components/ui";

type Doc = {
  id: string;
  title: string;
  type: string;
  url?: string | null;
  createdAt: string;
  patientName?: string;
  authorName?: string | null;
  /** Emitido por modelo, então tem corpo para imprimir. */
  printable?: boolean;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export default function Documentos() {
  const [items, setItems] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        (d.patientName ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState message={error} /> : null}

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, tipo ou paciente"
          className="pl-9"
          aria-label="Buscar documento"
        />
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={28} />}
            title={items.length === 0 ? "Nenhum documento" : "Nenhum resultado"}
            description={
              items.length === 0
                ? "Receitas, atestados e anotações aparecem aqui."
                : "Ajuste a busca para encontrar o documento."
            }
          />
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Título</TH>
              <TH>Tipo</TH>
              <TH className="hidden sm:table-cell">Paciente</TH>
              <TH className="hidden lg:table-cell">Emitido por</TH>
              <TH className="hidden md:table-cell">Criado em</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {filtered.map((d) => {
              const href = safeHttpUrl(d.url);
              return (
              <TR key={d.id}>
                <TD className="font-medium">{d.title}</TD>
                <TD>
                  <Badge>{documentTypeLabel(d.type)}</Badge>
                </TD>
                <TD className="hidden text-ink-muted sm:table-cell">{d.patientName ?? "—"}</TD>
                <TD className="hidden text-ink-muted lg:table-cell">{d.authorName ?? "—"}</TD>
                <TD className="hidden text-ink-muted md:table-cell">
                  {dateFmt.format(new Date(d.createdAt))}
                </TD>
                <TD className="text-right">
                  {d.printable ? (
                    <a
                      href={documentPrintPath(d.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      <Printer size={14} />
                      Imprimir
                    </a>
                  ) : href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      Abrir
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="text-sm text-ink-soft">—</span>
                  )}
                </TD>
              </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
