import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { DOCUMENT_TYPE_CODES, DocumentTypeCode } from "../documents.templates";

/** Cadastro manual (anotação avulsa / link externo). */
export class CreateDocumentDto {
  @IsString()
  patientProfileId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MaxLength(50)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;
}

/** Emissão a partir de um modelo (receita, atestado, declaração...). */
export class IssueDocumentDto {
  @IsString()
  patientProfileId!: string;

  @IsIn(DOCUMENT_TYPE_CODES, { message: "Tipo de documento inválido" })
  type!: DocumentTypeCode;

  /** Campos específicos do modelo; validados em `documents.templates`. */
  @IsObject()
  fields!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  appointmentId?: string;
}
