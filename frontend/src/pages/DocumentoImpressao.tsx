import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "../services/api";
import { btn } from "../utils/buttonStyles";
import { documentTypeLabel } from "../components/paciente/documentos/document-types";
import { ClinicMark } from "../components/brand/ClinicMark";
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
    legalName: string | null;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    logoUrl: string | null;
    documentFooter: string | null;
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

      <article className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-surface px-[18mm] py-[16mm] shadow-card print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <ClinicMark
              name={letterhead.clinicName ?? "Clínica"}
              logoUrl={letterhead.logoUrl}
              size={44}
            />
            <div className="min-w-0 text-[11px] leading-snug text-ink">
              <p className="text-lg font-bold leading-tight text-ink">
                {letterhead.clinicName ?? "Clínica"}
              </p>
              {letterhead.legalName ? <p>{letterhead.legalName}</p> : null}
              {letterhead.cnpj ? <p>CNPJ {letterhead.cnpj}</p> : null}
              {letterhead.address ? <p>{letterhead.address}</p> : null}
              <p className="text-ink-muted">
                {[letterhead.phone, letterhead.email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <p className="shrink-0 text-right text-xs uppercase tracking-wide text-ink-muted">
            {documentTypeLabel(doc.type)}
          </p>
        </header>

        <h1 className="mt-8 text-center text-base font-bold uppercase tracking-wide text-ink">
          {doc.title}
        </h1>

        <div className="mt-6 flex-1 whitespace-pre-wrap text-[13px] leading-7 text-ink">
          {doc.content}
        </div>

        <footer className="mt-10">
          <p className="text-right text-[13px] text-ink">
            {dateFmt.format(new Date(doc.createdAt))}
          </p>
          <div className="mt-14 grid grid-cols-2 gap-10">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-56 border-t border-ink pt-1.5 text-center">
                <p className="text-[13px] font-semibold text-ink">
                  {letterhead.authorName ?? "Profissional responsável"}
                </p>
                <p className="text-xs text-ink-muted">
                  {letterhead.authorCro
                    ? letterhead.authorCro.toUpperCase().startsWith("CRO")
                      ? letterhead.authorCro
                      : `CRO ${letterhead.authorCro}`
                    : "Cirurgião(ã)-Dentista"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full max-w-56 border-t border-ink pt-1.5 text-center">
                <p className="text-[13px] font-semibold text-ink">{doc.patientName}</p>
                <p className="text-xs text-ink-muted">Paciente / responsável</p>
              </div>
            </div>
          </div>
          {letterhead.documentFooter ? (
            <p className="mt-8 text-center text-[11px] text-ink-muted">{letterhead.documentFooter}</p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
