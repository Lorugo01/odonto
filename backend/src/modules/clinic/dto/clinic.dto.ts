import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

function emptyToNull(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export class UpdateClinicSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string | null;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string | null;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsEmail({}, { message: "E-mail da clínica inválido" })
  email?: string | null;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string | null;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  website?: string | null;

  /** URL http(s) ou data URL da logomarca (png/jpeg/webp). */
  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(350000)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "Informe a cor no formato #RRGGBB" })
  primaryColor?: string;

  @Transform(({ value }) => emptyToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(240)
  documentFooter?: string | null;
}
