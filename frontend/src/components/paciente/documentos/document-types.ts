import { Role, hasRole } from "../../../types";

/** Códigos aceitos por `POST /documents/issue` (espelha documents.templates.ts). */
export type DocumentTypeCode =
  | "RECEITA"
  | "ATESTADO"
  | "DECLARACAO"
  | "ENCAMINHAMENTO"
  | "ORIENTACAO"
  | "ANOTACAO";

const CLINICAL: Role[] = ["CLINIC_ADMIN", "DENTIST"];
const ADMINISTRATIVE: Role[] = ["CLINIC_ADMIN", "DENTIST", "RECEPTION"];

export const DOCUMENT_TYPES: Array<{
  code: DocumentTypeCode;
  label: string;
  description: string;
  roles: Role[];
}> = [
  {
    code: "RECEITA",
    label: "Receita",
    description: "Prescrição de medicamentos com posologia.",
    roles: CLINICAL,
  },
  {
    code: "ATESTADO",
    label: "Atestado",
    description: "Afastamento de atividades por período determinado.",
    roles: CLINICAL,
  },
  {
    code: "DECLARACAO",
    label: "Declaração",
    description: "Comprovante de comparecimento à clínica.",
    roles: ADMINISTRATIVE,
  },
  {
    code: "ENCAMINHAMENTO",
    label: "Encaminhamento",
    description: "Indicação para outra especialidade.",
    roles: CLINICAL,
  },
  {
    code: "ORIENTACAO",
    label: "Pós-operatório",
    description: "Orientações após o procedimento.",
    roles: CLINICAL,
  },
  {
    code: "ANOTACAO",
    label: "Outro",
    description: "Documento livre com título e texto.",
    roles: ADMINISTRATIVE,
  },
];

/** Rótulo amigável, com fallback para tipos antigos gravados como texto livre. */
export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find((t) => t.code === type)?.label ?? type;
}

/** Modelos que o usuário pode emitir, considerando papéis acumulados. */
export function documentTypesFor(user: { roles?: Role[]; isPlatformAdmin?: boolean } | null) {
  if (!user) return [];
  return DOCUMENT_TYPES.filter((t) => hasRole(user, ...t.roles));
}
