import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  role: string;
  clinicId: string;
  clinicName: string;
  isPlatformAdmin: boolean;
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as AuthUser;
});
