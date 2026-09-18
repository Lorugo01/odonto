import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Limite para não permitir payload abusivo no corpo da evolução. */
export const NOTE_MAX_LENGTH = 10_000;

export class CreateClinicalNoteDto {
  @IsString()
  patientProfileId!: string;

  @IsString()
  @MinLength(3, { message: "A evolução precisa de pelo menos 3 caracteres" })
  @MaxLength(NOTE_MAX_LENGTH)
  body!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;
}

export class UpdateClinicalNoteDto {
  @IsString()
  @MinLength(3, { message: "A evolução precisa de pelo menos 3 caracteres" })
  @MaxLength(NOTE_MAX_LENGTH)
  body!: string;
}
