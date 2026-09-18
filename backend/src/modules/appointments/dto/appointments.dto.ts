import { AppointmentStatus } from "@prisma/client";
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsISO8601({}, { message: "Horário inválido" })
  startsAt!: string;

  /** Obrigatório para a equipe; o paciente agenda sempre para si. */
  @IsOptional()
  @IsString()
  patientProfileId?: string;

  /** Motivo informado pelo paciente ao solicitar. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  patientNote?: string;
}

export class PatchAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus, { message: "Situação inválida" })
  status?: AppointmentStatus;
}
