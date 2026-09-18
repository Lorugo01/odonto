import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { can } from "../../common/utils/permissions.util";
import { CreateTreatmentDto, UpsertTreatmentDto } from "./dto/treatments.dto";
import { resolveTreatment } from "./treatments.util";

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catálogo da clínica cruzado com os ajustes do profissional. Retorna também
   * os serviços que ele ainda não atende, para a tela poder ativá-los.
   */
  async list(user: AuthUser, professionalId?: string, includeInactive = false) {
    const showInactive = includeInactive && can(user, "CLINIC_ADMIN");
    const [services, professional] = await Promise.all([
      this.prisma.service.findMany({
        where: { clinicId: user.clinicId, ...(showInactive ? {} : { active: true }) },
        orderBy: { name: "asc" },
      }),
      this.findProfessionalOrNull(user, professionalId),
    ]);

    if (!professional) {
      return {
        professional: null,
        treatments: services.map((service) => resolveTreatment(service, null)),
      };
    }

    const overrides = await this.prisma.professionalService.findMany({
      where: { professionalId: professional.id },
    });
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

  /**
   * Cria um tipo no catálogo e já marca o dentista como atendendo, com a
   * descrição, duração e preço informados.
   */
  async create(user: AuthUser, dto: CreateTreatmentDto) {
    const professional = await this.resolveProfessional(user, dto.professionalId);
    const name = dto.name.trim();
    const description = dto.description?.trim() || null;

    const existing = await this.prisma.service.findFirst({
      where: { clinicId: user.clinicId, name: { equals: name, mode: "insensitive" } },
    });
    const service =
      existing ??
      (await this.prisma.service.create({
        data: {
          clinicId: user.clinicId,
          name,
          description,
          durationMin: dto.durationMin,
          priceCents: dto.priceCents,
        },
      }));

    const saved = await this.prisma.professionalService.upsert({
      where: {
        professionalId_serviceId: { professionalId: professional.id, serviceId: service.id },
      },
      create: {
        professionalId: professional.id,
        serviceId: service.id,
        description,
        durationMin: dto.durationMin,
        priceCents: dto.priceCents,
        active: true,
      },
      update: {
        description,
        durationMin: dto.durationMin,
        priceCents: dto.priceCents,
        active: true,
      },
    });
    await this.audit(user, existing ? "LINK" : "CREATE", saved.id);
    return resolveTreatment(service, saved);
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
   * Admin sem cadastro de dentista pode ver o catálogo sem um profissional.
   * Criar/ajustar oferta ainda exige resolveProfessional.
   */
  private async findProfessionalOrNull(user: AuthUser, professionalId: string | undefined) {
    if (professionalId) return this.resolveProfessional(user, professionalId);
    const own = await this.prisma.professional.findUnique({
      where: { clinicId_userId: { clinicId: user.clinicId, userId: user.userId } },
      include: { user: { select: { name: true } } },
    });
    if (own) return own;
    if (can(user, "CLINIC_ADMIN")) return null;
    throw new BadRequestException("Seu usuário não está cadastrado como dentista");
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
