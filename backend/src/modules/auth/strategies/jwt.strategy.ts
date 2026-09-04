import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthUser } from "../../../common/decorators/current-user.decorator";

type JwtPayload = {
  sub: string;
  role: string;
  clinicId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET", "default-secret"),
      passReqToCallback: true,
    });
  }

  async validate(req: { headers: Record<string, string | string[] | undefined> }, payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { clinic: true } } },
    });
    if (!user) {
      throw new UnauthorizedException("Acesso não autorizado");
    }

    const header = req.headers["x-clinic-id"];
    const requested = Array.isArray(header) ? header[0] : header;
    const membership =
      user.roles.find((r) => r.clinicId === requested) ??
      user.roles.find((r) => r.clinicId === payload.clinicId) ??
      user.roles[0];

    if (!membership && !user.isPlatformAdmin) {
      throw new UnauthorizedException("Acesso não autorizado");
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: membership?.role ?? payload.role,
      clinicId: membership?.clinicId ?? payload.clinicId,
      clinicName: membership?.clinic.name ?? "",
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
