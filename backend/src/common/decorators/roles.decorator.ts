import { SetMetadata } from "@nestjs/common";
import { Role } from "../utils/permissions.util";

export const ROLES_KEY = "roles";

/** Libera a rota para quem acumular pelo menos um dos papéis informados. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
