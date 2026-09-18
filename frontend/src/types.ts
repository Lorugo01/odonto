export type Role = "CLINIC_ADMIN" | "DENTIST" | "RECEPTION" | "PATIENT";

export type Usuario = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  clinicId: string;
  clinicName: string;
  /** Papel de maior precedência, usado só para exibição. */
  role: Role;
  /** Papéis acumulados na clínica ativa; é a base das permissões. */
  roles: Role[];
  /** Vínculos em todas as clínicas. */
  memberships: Array<{ clinicId: string; clinicName: string; role: Role }>;
};

export type Appointment = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status: string;
  patientNote?: string | null;
  professional: { id?: string; name: string; specialty?: string | null };
  patient?: { id: string; name: string };
  service: { id?: string; name: string; durationMin?: number };
};

export const statusLabel: Record<string, string> = {
  REQUESTED: "Solicitada",
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  NO_SHOW: "Falta",
};

export const roleLabel: Record<Role, string> = {
  CLINIC_ADMIN: "Administrador",
  DENTIST: "Dentista",
  RECEPTION: "Recepção",
  PATIENT: "Paciente",
};

/** Alvo das permissões: aceita o usuário logado ou uma lista de papéis. */
type RoleSource = { roles?: Role[]; isPlatformAdmin?: boolean } | Role[] | null | undefined;

function rolesOf(source: RoleSource): Role[] {
  if (!source) return [];
  return Array.isArray(source) ? source : (source.roles ?? []);
}

function isPlatformAdmin(source: RoleSource): boolean {
  return !Array.isArray(source) && source?.isPlatformAdmin === true;
}

/** O usuário acumula algum dos papéis informados. */
export function hasRole(source: RoleSource, ...roles: Role[]): boolean {
  if (isPlatformAdmin(source)) return true;
  const own = rolesOf(source);
  return roles.some((role) => own.includes(role));
}

/** Pertence à equipe da clínica (qualquer papel que não seja paciente). */
export function isStaff(source: RoleSource): boolean {
  return hasRole(source, "CLINIC_ADMIN", "DENTIST", "RECEPTION");
}

/** Prontuário/evolução clínica é restrito ao corpo clínico (sigilo). */
export function canSeeClinicalNotes(source: RoleSource): boolean {
  return hasRole(source, "CLINIC_ADMIN", "DENTIST");
}

/** O catálogo de tipos de tratamento é mantido pelo administrador. */
export function canManageCatalog(source: RoleSource): boolean {
  return hasRole(source, "CLINIC_ADMIN");
}

/** Quem configura tratamentos: o dentista os seus, o administrador de todos. */
export function canManageTreatments(source: RoleSource): boolean {
  return hasRole(source, "CLINIC_ADMIN", "DENTIST");
}

/** Aprovar ou recusar solicitações de consulta. */
export function canReviewRequests(source: RoleSource): boolean {
  return isStaff(source);
}
