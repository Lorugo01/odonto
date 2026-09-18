import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { Role, STAFF_ROLES } from "../../common/utils/permissions.util";
import { CreateTeamMemberDto, SetRolesDto, UpdateTeamMemberDto } from "./dto/team.dto";

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  /** Integrantes com pelo menos um papel de equipe na clínica. */
  async list(user: AuthUser) {
    const links = await this.prisma.userClinicRole.findMany({
      where: { clinicId: user.clinicId, role: { in: STAFF_ROLES } },
      include: { user: true },
    });

    const byUser = new Map<string, { name: string; email: string; roles: Role[] }>();
    for (const link of links) {
      const entry = byUser.get(link.userId);
      if (entry) entry.roles.push(link.role);
      else byUser.set(link.userId, { name: link.user.name, email: link.user.email, roles: [link.role] });
    }

    const professionals = await this.prisma.professional.findMany({
      where: { clinicId: user.clinicId },
      select: { userId: true, cro: true, specialty: true },
    });
    const proByUser = new Map(professionals.map((p) => [p.userId, p]));

    return [...byUser.entries()]
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        email: data.email,
        roles: data.roles,
        cro: proByUser.get(userId)?.cro ?? null,
        specialty: proByUser.get(userId)?.specialty ?? null,
        isSelf: userId === user.userId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  async create(user: AuthUser, dto: CreateTeamMemberDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (!existing && !dto.senha) {
      throw new BadRequestException("Informe uma senha para o novo acesso");
    }
    if (existing) {
      const alreadyStaff = await this.prisma.userClinicRole.findFirst({
        where: { userId: existing.id, clinicId: user.clinicId, role: { in: STAFF_ROLES } },
      });
      if (alreadyStaff) throw new ConflictException("Este e-mail já faz parte da equipe");
    }

    // O hash fica fora da transação: é lento e seguraria o lock à toa.
    const passwordHash = existing ? null : await bcrypt.hash(dto.senha as string, 10);

    const userId = await this.prisma.$transaction(async (tx) => {
      // Nunca sobrescreve a senha de um usuário que já existe (pode ser paciente).
      const target =
        existing ??
        (await tx.user.create({
          data: { email, name: dto.name.trim(), passwordHash: passwordHash as string },
        }));
      await this.applyRoles(tx, user.clinicId, target.id, dto.roles, dto);
      return target.id;
    });

    await this.audit(user, "CREATE", userId);
    return this.findMember(user, userId);
  }

  async setRoles(user: AuthUser, targetUserId: string, dto: SetRolesDto) {
    const current = await this.prisma.userClinicRole.findMany({
      where: { clinicId: user.clinicId, userId: targetUserId, role: { in: STAFF_ROLES } },
      select: { role: true },
    });
    if (current.length === 0) throw new NotFoundException("Integrante não encontrado");

    if (dto.roles.length === 0) {
      throw new BadRequestException("Selecione pelo menos um papel ou remova o integrante");
    }
    if (targetUserId === user.userId && !dto.roles.includes("CLINIC_ADMIN")) {
      throw new BadRequestException("Você não pode remover o seu próprio acesso de administrador");
    }
    if (current.some((r) => r.role === "CLINIC_ADMIN") && !dto.roles.includes("CLINIC_ADMIN")) {
      await this.assertAnotherAdminExists(user.clinicId, targetUserId);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.applyRoles(tx, user.clinicId, targetUserId, dto.roles, dto);
    });
    await this.audit(user, "UPDATE", targetUserId);
    return this.findMember(user, targetUserId);
  }

  async update(user: AuthUser, targetUserId: string, dto: UpdateTeamMemberDto) {
    const current = await this.prisma.userClinicRole.findMany({
      where: { clinicId: user.clinicId, userId: targetUserId, role: { in: STAFF_ROLES } },
      select: { role: true },
    });
    if (current.length === 0) throw new NotFoundException("Integrante não encontrado");

    const hasDentist = current.some((r) => r.role === "DENTIST");
    const name = dto.name?.trim();
    const email = dto.email?.trim().toLowerCase();
    const cro = dto.cro?.trim();
    const specialty = dto.specialty === undefined ? undefined : dto.specialty.trim() || null;

    if (email) {
      const taken = await this.prisma.user.findFirst({
        where: { email, id: { not: targetUserId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException("E-mail já cadastrado");
    }

    if (hasDentist && dto.cro !== undefined && !cro) {
      throw new BadRequestException("O CRO é obrigatório para quem atende como dentista");
    }

    const passwordHash = dto.senha ? await bcrypt.hash(dto.senha, 10) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          name: name || undefined,
          email: email || undefined,
          passwordHash,
        },
      });

      if (dto.cro !== undefined || dto.specialty !== undefined) {
        const professional = await tx.professional.findUnique({
          where: { clinicId_userId: { clinicId: user.clinicId, userId: targetUserId } },
        });
        if (professional) {
          await tx.professional.update({
            where: { id: professional.id },
            data: {
              cro: cro || undefined,
              specialty,
            },
          });
        } else if (hasDentist) {
          if (!cro) throw new BadRequestException("Informe o CRO para o cadastro de dentista");
          await tx.professional.create({
            data: {
              clinicId: user.clinicId,
              userId: targetUserId,
              cro,
              specialty: specialty ?? undefined,
            },
          });
        }
      }
    });

    await this.audit(user, "UPDATE_PROFILE", targetUserId);
    return this.findMember(user, targetUserId);
  }

  /** Revoga o acesso de equipe. O cadastro do profissional é preservado. */
  async remove(user: AuthUser, targetUserId: string) {
    if (targetUserId === user.userId) {
      throw new BadRequestException("Você não pode remover o seu próprio acesso");
    }
    const current = await this.prisma.userClinicRole.findMany({
      where: { clinicId: user.clinicId, userId: targetUserId, role: { in: STAFF_ROLES } },
      select: { role: true },
    });
    if (current.length === 0) throw new NotFoundException("Integrante não encontrado");
    if (current.some((r) => r.role === "CLINIC_ADMIN")) {
      await this.assertAnotherAdminExists(user.clinicId, targetUserId);
    }
    await this.prisma.userClinicRole.deleteMany({
      where: { clinicId: user.clinicId, userId: targetUserId, role: { in: STAFF_ROLES } },
    });
    await this.audit(user, "DELETE", targetUserId);
    return { ok: true };
  }

  /**
   * Sincroniza os papéis de equipe do usuário na clínica. O papel de dentista
   * exige cadastro de profissional (CRO), porque é ele que assina documentos.
   */
  private async applyRoles(
    tx: Prisma.TransactionClient,
    clinicId: string,
    userId: string,
    roles: Role[],
    profile: { cro?: string; specialty?: string },
  ) {
    const unique = [...new Set(roles)];

    if (unique.includes("DENTIST")) {
      const professional = await tx.professional.findUnique({
        where: { clinicId_userId: { clinicId, userId } },
      });
      const cro = profile.cro?.trim();
      if (!professional && !cro) {
        throw new BadRequestException("Informe o CRO para conceder o papel de dentista");
      }
      await tx.professional.upsert({
        where: { clinicId_userId: { clinicId, userId } },
        create: { clinicId, userId, cro: cro as string, specialty: profile.specialty?.trim() },
        update: {
          cro: cro ?? professional?.cro,
          specialty: profile.specialty === undefined ? undefined : profile.specialty.trim() || null,
        },
      });
    }

    await tx.userClinicRole.deleteMany({
      where: { clinicId, userId, role: { in: STAFF_ROLES.filter((r) => !unique.includes(r)) } },
    });
    for (const role of unique) {
      await tx.userClinicRole.upsert({
        where: { userId_clinicId_role: { userId, clinicId, role } },
        create: { userId, clinicId, role },
        update: {},
      });
    }
  }

  /** Impede que a clínica fique sem nenhum administrador. */
  private async assertAnotherAdminExists(clinicId: string, exceptUserId: string) {
    const other = await this.prisma.userClinicRole.findFirst({
      where: { clinicId, role: "CLINIC_ADMIN", userId: { not: exceptUserId } },
      select: { id: true },
    });
    if (!other) {
      throw new BadRequestException("A clínica precisa de pelo menos um administrador");
    }
  }

  private async findMember(user: AuthUser, userId: string) {
    const members = await this.list(user);
    const member = members.find((m) => m.userId === userId);
    if (!member) throw new NotFoundException("Integrante não encontrado");
    return member;
  }

  private audit(user: AuthUser, action: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action,
        entity: "TeamMember",
        entityId,
      },
    });
  }
}
