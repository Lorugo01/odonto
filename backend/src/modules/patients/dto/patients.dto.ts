import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

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
