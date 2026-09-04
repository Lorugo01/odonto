import { ValidationError } from "class-validator";
import { Prisma } from "@prisma/client";

export function flattenValidationErrors(errors: ValidationError[], parent = ""): string[] {
  const out: string[] = [];
  for (const err of errors) {
    const path = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      out.push(...Object.values(err.constraints).map((m) => `${path}: ${m}`));
    }
    if (err.children?.length) {
      out.push(...flattenValidationErrors(err.children, path));
    }
  }
  return out;
}

export function humanizePrismaError(error: Prisma.PrismaClientKnownRequestError): string {
  switch (error.code) {
    case "P2002":
      return "Este registro já existe.";
    case "P2025":
      return "Registro não encontrado ou já foi removido.";
    default:
      return "Não foi possível salvar os dados.";
  }
}

export function sanitizeForUser(message: string, statusCode: number, isProduction: boolean): string {
  const trimmed = message.trim();
  if (isProduction && statusCode >= 500) return defaultMessageForStatus(statusCode);
  return trimmed || defaultMessageForStatus(statusCode);
}

export function defaultMessageForStatus(statusCode: number): string {
  const map: Record<number, string> = {
    400: "Não foi possível processar a solicitação.",
    401: "Credenciais inválidas ou sessão expirada.",
    403: "Você não tem permissão para realizar esta ação.",
    404: "Registro não encontrado.",
    409: "Conflito ao salvar.",
  };
  if (map[statusCode]) return map[statusCode];
  if (statusCode >= 500) return "Erro interno do servidor.";
  return "Não foi possível concluir a operação.";
}

export function joinUserMessages(messages: string[]): string {
  return [...new Set(messages.map((m) => m.trim()).filter(Boolean))].join(" ");
}
