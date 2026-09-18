import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Stethoscope } from "lucide-react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import { documentTypeLabel } from "../components/paciente/documentos/document-types";
import { ErrorState, Skeleton } from "../components/ui";

type DocumentDetail = {
  id: string;
  title: string;
  type: string;
  content: string | null;
  createdAt: string;
  patientName: string;
  letterhead: {
    clinicName: string | null;
    authorName: string | null;
    authorCro: string | null;
  };
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

/**
 * Folha A4 para impressão (ou "Salvar como PDF" no diálogo do navegador).
 * Renderiza fora do AppLayout, então não há menu nem cabeçalho na impressão.
 */
export default function DocumentoImpressao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<DocumentDetail>(`/documents/${id}`)
      .then((r) => setDoc(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[210mm] p-6">
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorState message={error || "Documento não encontrado"} />
        <button type="button" className={`${btn.secondary} mt-3`} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>
    );
  }

  const { letterhead } = doc;

  return (
    <div className="min-h-screen bg-canvas py-6 print:bg-surface print:py-0">
      {/* Barra de ações: escondida na impressão */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
        <button type="button" className={btn.secondary} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <button type="button" className={btn.primary} onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir / Salvar PDF
        </button>
      </div>

      <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-surface px-[18mm] py-[16mm] shadow-card print:min-h-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white print:hidden">
              <Stethoscope size={20} />
            </span>
            <div>
              <p className="text-lg font-bold leading-tight text-ink">
                {letterhead.clinicName ?? "Clínica"}
              </p>
              <p className="text-xs text-ink-muted">Odontologia</p>
            </div>
          </div>
          <p className="text-right text-xs uppercase tracking-wide text-ink-muted">
            {documentTypeLabel(doc.type)}
          </p>
        </header>

        <h1 className="mt-8 text-center text-base font-bold uppercase tracking-wide text-ink">
          {doc.title}
        </h1>

        <div className="mt-6 whitespace-pre-wrap text-[13px] leading-7 text-ink">
          {doc.content}
        </div>

        <footer className="mt-16">
          <p className="text-right text-[13px] text-ink">
            {dateFmt.format(new Date(doc.createdAt))}
          </p>
          <div className="mt-12 flex flex-col items-center">
            <div className="w-72 border-t border-ink pt-1.5 text-center">
              <p className="text-[13px] font-semibold text-ink">
                {letterhead.authorName ?? "Profissional responsável"}
              </p>
              <p className="text-xs text-ink-muted">
                {letterhead.authorCro ? `CRO ${letterhead.authorCro}` : "Cirurgião(ã)-Dentista"}
              </p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
