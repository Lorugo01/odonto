import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

const MAX_DURATION_MIN = 8 * 60;
const MAX_PRICE_CENTS = 100_000_00;

/**
 * Define o tratamento que um dentista atende. Campos omitidos ou nulos herdam
 * o valor do catálogo da clínica.
 */
export class UpsertTreatmentDto {
  @IsString()
  serviceId!: string;

  /** Só o administrador pode configurar o tratamento de outro profissional. */
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsInt({ message: "A duração deve ser um número em minutos" })
  @Min(5, { message: "A duração mínima é de 5 minutos" })
  @Max(MAX_DURATION_MIN, { message: "A duração máxima é de 8 horas" })
  durationMin?: number | null;

  @IsOptional()
  @IsInt({ message: "O valor deve ser informado em centavos" })
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  priceCents?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateTreatmentDto {
  @IsString()
  @MinLength(2, { message: "O nome do tratamento deve ter no mínimo 2 caracteres" })
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt({ message: "Informe a duração em minutos" })
  @Min(5, { message: "A duração mínima é de 5 minutos" })
  @Max(MAX_DURATION_MIN, { message: "A duração máxima é de 8 horas" })
  durationMin!: number;

  @IsInt({ message: "Informe o valor em centavos" })
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  priceCents!: number;

  @IsOptional()
  @IsString()
  professionalId?: string;
}
