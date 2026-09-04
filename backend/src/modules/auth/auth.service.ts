import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto, RegisterPatientDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: { include: { clinic: true } } },
    });
    if (!user) throw new UnauthorizedException("Credenciais inválidas");
    const ok = await bcrypt.compare(dto.senha, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Credenciais inválidas");
    return this.issue(user.id);
  }

  async registerPatient(dto: RegisterPatientDto) {
    if (!dto.consent) throw new BadRequestException("É necessário aceitar o termo de uso");
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("E-mail já cadastrado");
    }
    const clinic = await this.prisma.clinic.findFirst({
      where: { slug: dto.clinicSlug, status: "ACTIVE" },
    });
    if (!clinic) throw new BadRequestException("Clínica não encontrada");
    const passwordHash = await bcrypt.hash(dto.senha, 10);
    const created = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name: dto.name, passwordHash, consentAt: new Date() },
      });
      const profile = await tx.patientProfile.create({
        data: { userId: u.id, phone: dto.phone },
      });
      await tx.userClinicRole.create({
        data: { userId: u.id, clinicId: clinic.id, role: "PATIENT" },
      });
      await tx.clinicPatient.create({
        data: { clinicId: clinic.id, patientProfileId: profile.id },
      });
      return u;
    });
    return this.issue(created.id);
  }

  async me(userId: string) {
    return this.buildUser(userId);
  }

  private async issue(userId: string) {
    const user = await this.buildUser(userId);
    const token = await this.jwt.signAsync({
      sub: userId,
      role: user.role,
      clinicId: user.clinicId,
    });
    return { token, user };
  }

  private async buildUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { clinic: true } } },
    });
    if (!user) throw new UnauthorizedException();
    const staff = user.roles.find((r) => r.role !== "PATIENT");
    const primary = staff ?? user.roles[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
      clinicId: primary?.clinicId ?? "",
      clinicName: primary?.clinic.name ?? "",
      role: primary?.role ?? "PATIENT",
      roles: user.roles.map((r) => ({
        clinicId: r.clinicId,
        clinicName: r.clinic.name,
        role: r.role,
      })),
    };
  }
}
