import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { can } from "../../common/utils/permissions.util";
import { UpsertTreatmentDto } from "./dto/treatments.dto";
import { resolveTreatment } from "./treatments.util";

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catálogo da clínica cruzado com os ajustes do profissional. Retorna também
   * os serviços que ele ainda não atende, para a tela poder ativá-los.
   */
  async list(user: AuthUser, professionalId?: string) {
    const professional = await this.resolveProfessional(user, professionalId);
    const [services, overrides] = await Promise.all([
      this.prisma.service.findMany({
        where: { clinicId: user.clinicId, active: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.professionalService.findMany({ where: { professionalId: professional.id } }),
    ]);
    const byService = new Map(overrides.map((o) => [o.serviceId, o]));
    return {
      professional: { id: professional.id, name: professional.user.name },
      treatments: services.map((service) =>
        resolveTreatment(service, byService.get(service.id) ?? null),
      ),
    };
  }

  /** Tratamentos oferecidos por um profissional, para o paciente escolher. */
  async offered(user: AuthUser, professionalId: string) {
    if (!professionalId) throw new BadRequestException("Profissional obrigatório");
    const professional = await this.prisma.professional.findFirst({
      where: { id: professionalId, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!professional) throw new NotFoundException("Profissional não encontrado");

    const overrides = await this.prisma.professionalService.findMany({
      where: { professionalId, active: true, service: { active: true } },
      include: { service: true },
      orderBy: { service: { name: "asc" } },
    });

    // Clínica que ainda não configurou tratamentos continua oferecendo o
    // catálogo inteiro, para não travar a agenda durante a implantação.
    if (overrides.length === 0) {
      const services = await this.prisma.service.findMany({
        where: { clinicId: user.clinicId, active: true },
        orderBy: { name: "asc" },
      });
      return services.map((service) => ({
        ...resolveTreatment(service, null),
        active: true,
      }));
    }

    return overrides.map((o) => resolveTreatment(o.service, o));
  }

  async upsert(user: AuthUser, dto: UpsertTreatmentDto) {
    const professional = await this.resolveProfessional(user, dto.professionalId);
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, clinicId: user.clinicId },
    });
    if (!service) throw new NotFoundException("Serviço não encontrado");

    const data = {
      description: normalizeText(dto.description),
      durationMin: dto.durationMin ?? null,
      priceCents: dto.priceCents ?? null,
      active: dto.active ?? true,
    };
    const saved = await this.prisma.professionalService.upsert({
      where: {
        professionalId_serviceId: { professionalId: professional.id, serviceId: service.id },
      },
      create: { professionalId: professional.id, serviceId: service.id, ...data },
      update: data,
    });
    await this.audit(user, "UPSERT", saved.id);
    return resolveTreatment(service, saved);
  }

  async remove(user: AuthUser, serviceId: string, professionalId?: string) {
    const professional = await this.resolveProfessional(user, professionalId);
    const existing = await this.prisma.professionalService.findUnique({
      where: { professionalId_serviceId: { professionalId: professional.id, serviceId } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Tratamento não encontrado");
    await this.prisma.professionalService.delete({ where: { id: existing.id } });
    await this.audit(user, "DELETE", existing.id);
    return { ok: true };
  }

  /**
   * O dentista mexe apenas nos tratamentos dele; o administrador pode ajustar
   * os de qualquer profissional da clínica.
   */
  private async resolveProfessional(user: AuthUser, professionalId: string | undefined) {
    if (professionalId) {
      const target = await this.prisma.professional.findFirst({
        where: { id: professionalId, clinicId: user.clinicId },
        include: { user: { select: { name: true } } },
      });
      if (!target) throw new NotFoundException("Profissional não encontrado");
      if (!can(user, "CLINIC_ADMIN") && target.userId !== user.userId) {
        throw new ForbiddenException("Você só pode ver e alterar os seus próprios tratamentos");
      }
      return target;
    }

    const own = await this.prisma.professional.findUnique({
      where: { clinicId_userId: { clinicId: user.clinicId, userId: user.userId } },
      include: { user: { select: { name: true } } },
    });
    if (!own) throw new BadRequestException("Seu usuário não está cadastrado como dentista");
    return own;
  }

  private audit(user: AuthUser, action: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action,
        entity: "ProfessionalService",
        entityId,
      },
    });
  }
}

/** String vazia é tratada como "herdar do catálogo". */
function normalizeText(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
