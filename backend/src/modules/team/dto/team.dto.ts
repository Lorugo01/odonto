import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Role, STAFF_ROLES } from "../../../common/utils/permissions.util";

/** Papéis acumuláveis pela equipe. O papel PATIENT é gerido em Pacientes. */
export class SetRolesDto {
  @IsArray()
  @IsIn(STAFF_ROLES, { each: true, message: "Papel inválido" })
  roles!: Role[];

  /** Obrigatório ao conceder o papel de dentista pela primeira vez. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;
}

export class CreateTeamMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: "E-mail inválido" })
  email!: string;

  /** Exigida apenas quando o e-mail ainda não existe no sistema. */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" })
  @MaxLength(72)
  senha?: string;

  @ArrayNotEmpty({ message: "Selecione pelo menos um papel" })
  @IsIn(STAFF_ROLES, { each: true, message: "Papel inválido" })
  roles!: Role[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;
}

/** Edição de perfil: nome, e-mail, senha e dados profissionais. */
export class UpdateTeamMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "E-mail inválido" })
  email?: string;

  /** Se informado, redefine a senha do acesso. */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" })
  @MaxLength(72)
  senha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;
}
