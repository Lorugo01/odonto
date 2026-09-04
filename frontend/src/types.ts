export type Role = "CLINIC_ADMIN" | "DENTIST" | "RECEPTION" | "PATIENT";

export type Usuario = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  clinicId: string;
  clinicName: string;
  role: Role;
  roles: Array<{ clinicId: string; clinicName: string; role: Role }>;
};

export type Appointment = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status: string;
  professional: { id?: string; name: string; specialty?: string | null };
  patient?: { id: string; name: string };
  service: { id?: string; name: string; durationMin?: number };
};

export const statusLabel: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  NO_SHOW: "Falta",
};

export function isStaff(role: Role) {
  return role !== "PATIENT";
}
