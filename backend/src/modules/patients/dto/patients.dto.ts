import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  senha?: string;
}

export class UpdatePatientChartDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  chartNumber?: string | null;

  @IsOptional()
  @IsString()
  maritalStatus?: string | null;

  @IsOptional()
  @IsString()
  phoneHome?: string | null;

  @IsOptional()
  @IsString()
  phoneWork?: string | null;

  @IsOptional()
  @IsString()
  phoneMobile?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  insurance?: string | null;

  @IsOptional()
  @IsString()
  referredBy?: string | null;

  @IsOptional()
  @IsBoolean()
  allergyAntibiotic?: boolean;

  @IsOptional()
  @IsBoolean()
  allergyAnesthetic?: boolean;

  @IsOptional()
  @IsString()
  allergyDetails?: string | null;

  @IsOptional()
  @IsBoolean()
  medSensitivity?: boolean | null;

  @IsOptional()
  @IsString()
  medSensitivityDetails?: string | null;

  @IsOptional()
  @IsBoolean()
  highBloodPressure?: boolean | null;

  @IsOptional()
  @IsString()
  highBloodPressureDetails?: string | null;

  @IsOptional()
  @IsBoolean()
  takingMedication?: boolean | null;

  @IsOptional()
  @IsString()
  takingMedicationDetails?: string | null;

  @IsOptional()
  @IsBoolean()
  healthProblems?: boolean | null;

  @IsOptional()
  @IsString()
  healthProblemsDetails?: string | null;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsOptional()
  @IsObject()
  /** JSON do react-advanced-odontogram (getStatusChart) ou legado FDI→status */
  odontogram?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  treatmentPlan?: string | null;

  @IsOptional()
  @IsString()
  planDate?: string | null;
}
