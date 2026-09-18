import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserClinicRoleType } from "@prisma/client";

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  /** Papel de maior precedência, usado para exibição. */
  role: UserClinicRoleType;
  /** Papéis acumulados na clínica ativa; é a base das permissões. */
  roles: UserClinicRoleType[];
  clinicId: string;
  clinicName: string;
  isPlatformAdmin: boolean;
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as AuthUser;
});
