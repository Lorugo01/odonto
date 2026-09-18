import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthUser } from "../decorators/current-user.decorator";
import { Role, can } from "../utils/permissions.util";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) throw new ForbiddenException();
    // Papéis são acumuláveis: basta o usuário ter um dos exigidos.
    if (!can(user, ...required)) {
      throw new ForbiddenException("Sem permissão nesta clínica");
    }
    return true;
  }
}
