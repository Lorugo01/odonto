import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Max,
  Min,
} from "class-validator";

const MAX_DURATION_MIN = 8 * 60;
const MAX_PRICE_CENTS = 100_000_00;

export class CreateServiceDto {
  @IsString()
  @MinLength(2, { message: "O nome do serviço deve ter no mínimo 2 caracteres" })
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
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(MAX_DURATION_MIN)
  durationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
