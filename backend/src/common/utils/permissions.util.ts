import { UserClinicRoleType } from "@prisma/client";
import { AuthUser } from "../decorators/current-user.decorator";

export type Role = UserClinicRoleType;

/** Ordem de precedência usada apenas para exibir um papel "principal". */
const ROLE_PRIORITY: Role[] = ["CLINIC_ADMIN", "DENTIST", "RECEPTION", "PATIENT"];

export const STAFF_ROLES: Role[] = ["CLINIC_ADMIN", "DENTIST", "RECEPTION"];

/**
 * Papel de maior precedência entre os acumulados. Um usuário pode ser, por
 * exemplo, administrador e dentista ao mesmo tempo.
 */
export function primaryRole(roles: Role[]): Role {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "PATIENT";
}

/** O usuário acumula algum dos papéis informados na clínica ativa. */
export function hasRole(user: AuthUser, ...roles: Role[]): boolean {
  return roles.some((role) => user.roles.includes(role));
}

/** Permissão efetiva: um dos papéis exigidos ou administrador da plataforma. */
export function can(user: AuthUser, ...roles: Role[]): boolean {
  return user.isPlatformAdmin || hasRole(user, ...roles);
}

export function isStaff(user: AuthUser): boolean {
  return user.isPlatformAdmin || hasRole(user, ...STAFF_ROLES);
}

/**
 * Usuário sem nenhum papel da equipe. Só ele tem o acesso restrito aos
 * próprios dados — quem acumula um papel clínico continua vendo a clínica.
 */
export function isPatientOnly(user: AuthUser): boolean {
  return !isStaff(user);
}
