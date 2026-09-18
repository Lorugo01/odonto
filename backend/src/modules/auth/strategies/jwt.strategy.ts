import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthUser } from "../../../common/decorators/current-user.decorator";
import { primaryRole } from "../../../common/utils/permissions.util";

type JwtPayload = {
  sub: string;
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

    // Papéis são acumuláveis: carrega todos os vínculos do usuário na clínica
    // ativa (ex.: administrador que também atende como dentista).
    const clinicId = membership?.clinicId ?? payload.clinicId;
    const roles = user.roles.filter((r) => r.clinicId === clinicId).map((r) => r.role);

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: primaryRole(roles),
      roles,
      clinicId,
      clinicName: membership?.clinic.name ?? "",
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
