import { IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsString()
  patientProfileId?: string;
}

export class PatchAppointmentDto {
  @IsOptional()
  @IsString()
  status?: string;
}
