import { BadRequestException } from "@nestjs/common";

/**
 * Modelos de documento odontológico.
 *
 * O texto é renderizado aqui (e não no cliente) porque o corpo emitido é o
 * registro legal do documento: um único renderizador evita divergência entre
 * clientes e mantém a validação dos campos no servidor.
 */

export type DocumentTypeCode =
  | "RECEITA"
  | "ATESTADO"
  | "DECLARACAO"
  | "ENCAMINHAMENTO"
  | "ORIENTACAO"
  | "ANOTACAO";

export type IssueRole = "CLINIC_ADMIN" | "DENTIST" | "RECEPTION";

/** Dados do timbre, capturados no momento da emissão. */
export type IssueContext = {
  patientName: string;
  patientBirthDate: Date | null;
  clinicName: string;
  authorName: string;
  authorCro: string | null;
  timezone: string;
};

export type DocumentFields = Record<string, unknown>;

type Template = {
  label: string;
  /** Quem pode emitir. Receita e atestado são atos clínicos: sem recepção. */
  roles: IssueRole[];
  title(fields: DocumentFields, ctx: IssueContext): string;
  render(fields: DocumentFields, ctx: IssueContext): string;
};

const MAX_TEXT = 2000;
const MAX_MEDICATIONS = 20;

// --- Helpers de validação -------------------------------------------------

function text(fields: DocumentFields, key: string, label: string, max = MAX_TEXT): string {
  const raw = fields[key];
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new BadRequestException(`Informe ${label}`);
  }
  const value = raw.trim();
  if (value.length > max) {
    throw new BadRequestException(`${label} excede o tamanho máximo de ${max} caracteres`);
  }
  return value;
}

function optionalText(fields: DocumentFields, key: string, label: string, max = MAX_TEXT) {
  const raw = fields[key];
  if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) {
    return null;
  }
  return text(fields, key, label, max);
}

function integer(fields: DocumentFields, key: string, label: string, min: number, max: number) {
  const value = Number(fields[key]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(`${label} deve ser um número entre ${min} e ${max}`);
  }
  return value;
}

/** Aceita `YYYY-MM-DD` e devolve a data no fuso da clínica. */
function isoDate(fields: DocumentFields, key: string, label: string): Date {
  const raw = fields[key];
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new BadRequestException(`Informe ${label} no formato dia/mês/ano`);
  }
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} inválida`);
  }
  return parsed;
}

/** Aceita `HH:MM`. */
function optionalTime(fields: DocumentFields, key: string, label: string) {
  const raw = fields[key];
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
    throw new BadRequestException(`Informe ${label} no formato HH:MM`);
  }
  return raw;
}

type Medication = { name: string; quantity: string | null; instructions: string };

function medications(fields: DocumentFields): Medication[] {
  const raw = fields.medications;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new BadRequestException("Adicione pelo menos um medicamento");
  }
  if (raw.length > MAX_MEDICATIONS) {
    throw new BadRequestException(`Limite de ${MAX_MEDICATIONS} medicamentos por receita`);
  }
  return raw.map((item, index) => {
    const entry = (item ?? {}) as DocumentFields;
    const position = index + 1;
    return {
      name: text(entry, "name", `o medicamento ${position}`, 200),
      quantity: optionalText(entry, "quantity", `a quantidade do medicamento ${position}`, 100),
      instructions: text(entry, "instructions", `a posologia do medicamento ${position}`, 500),
    };
  });
}

// --- Formatação ----------------------------------------------------------

function dateFormatter(timezone: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "long" });
  } catch {
    // Fuso inválido no cadastro da clínica não deve impedir a emissão.
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
  }
}

function formatDate(date: Date, ctx: IssueContext) {
  return dateFormatter(ctx.timezone).format(date);
}

function patientLine(ctx: IssueContext) {
  if (!ctx.patientBirthDate) return `Paciente: ${ctx.patientName}`;
  return `Paciente: ${ctx.patientName} (nascimento: ${formatDate(ctx.patientBirthDate, ctx)})`;
}

function plural(count: number, singular: string, many: string) {
  return count === 1 ? singular : many;
}

// --- Modelos -------------------------------------------------------------

const CLINICAL: IssueRole[] = ["CLINIC_ADMIN", "DENTIST"];
const ADMINISTRATIVE: IssueRole[] = ["CLINIC_ADMIN", "DENTIST", "RECEPTION"];

export const DOCUMENT_TEMPLATES: Record<DocumentTypeCode, Template> = {
  RECEITA: {
    label: "Receita",
    roles: CLINICAL,
    title: () => "Receituário odontológico",
    render: (fields, ctx) => {
      const items = medications(fields);
      const notes = optionalText(fields, "notes", "as observações");
      const lines = [patientLine(ctx), "", "Uso conforme orientação:", ""];
      items.forEach((med, index) => {
        const quantity = med.quantity ? ` — ${med.quantity}` : "";
        lines.push(`${index + 1}) ${med.name}${quantity}`);
        lines.push(`   ${med.instructions}`);
        lines.push("");
      });
      if (notes) lines.push(`Observações: ${notes}`, "");
      return lines.join("\n").trimEnd();
    },
  },

  ATESTADO: {
    label: "Atestado",
    roles: CLINICAL,
    title: () => "Atestado odontológico",
    render: (fields, ctx) => {
      const days = integer(fields, "days", "O período de afastamento", 1, 365);
      const startDate = isoDate(fields, "startDate", "a data de início");
      const reason = optionalText(fields, "reason", "o motivo", 500);
      const cid = optionalText(fields, "cid", "o CID", 20);
      const lines = [
        patientLine(ctx),
        "",
        `Atesto, para os devidos fins, que o(a) paciente acima esteve sob meus cuidados profissionais e necessita de afastamento de suas atividades por ${days} ${plural(days, "dia", "dias")}, a contar de ${formatDate(startDate, ctx)}.`,
      ];
      if (reason) lines.push("", `Motivo: ${reason}`);
      if (cid) lines.push("", `CID: ${cid}`);
      return lines.join("\n");
    },
  },

  DECLARACAO: {
    label: "Declaração de comparecimento",
    roles: ADMINISTRATIVE,
    title: () => "Declaração de comparecimento",
    render: (fields, ctx) => {
      const date = isoDate(fields, "date", "a data do atendimento");
      const startTime = optionalTime(fields, "startTime", "o horário de início");
      const endTime = optionalTime(fields, "endTime", "o horário de término");
      const period =
        startTime && endTime
          ? `, das ${startTime} às ${endTime}`
          : startTime
            ? `, a partir das ${startTime}`
            : "";
      return [
        patientLine(ctx),
        "",
        `Declaro, para os devidos fins, que o(a) paciente acima compareceu a esta clínica em ${formatDate(date, ctx)}${period}, para atendimento odontológico.`,
      ].join("\n");
    },
  },

  ENCAMINHAMENTO: {
    label: "Encaminhamento",
    roles: CLINICAL,
    title: () => "Encaminhamento odontológico",
    render: (fields, ctx) => {
      const specialty = text(fields, "specialty", "a especialidade", 120);
      const reason = text(fields, "reason", "o motivo do encaminhamento");
      const findings = optionalText(fields, "findings", "os achados clínicos");
      const lines = [
        patientLine(ctx),
        "",
        `Encaminho o(a) paciente acima para avaliação em ${specialty}.`,
        "",
        `Motivo: ${reason}`,
      ];
      if (findings) lines.push("", `Achados clínicos: ${findings}`);
      lines.push("", "Fico à disposição para as informações complementares necessárias.");
      return lines.join("\n");
    },
  },

  ORIENTACAO: {
    label: "Orientações pós-operatórias",
    roles: CLINICAL,
    title: () => "Orientações pós-operatórias",
    render: (fields, ctx) => {
      const procedure = text(fields, "procedure", "o procedimento realizado", 200);
      const instructions = text(fields, "instructions", "as orientações");
      return [
        patientLine(ctx),
        "",
        `Procedimento realizado: ${procedure}`,
        "",
        "Orientações:",
        instructions,
      ].join("\n");
    },
  },

  ANOTACAO: {
    label: "Outro documento",
    roles: ADMINISTRATIVE,
    title: (fields) => text(fields, "title", "o título do documento", 150),
    render: (fields, ctx) => [patientLine(ctx), "", text(fields, "body", "o conteúdo")].join("\n"),
  },
};

export const DOCUMENT_TYPE_CODES = Object.keys(DOCUMENT_TEMPLATES) as DocumentTypeCode[];

export function isDocumentTypeCode(value: string): value is DocumentTypeCode {
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TEMPLATES, value);
}
