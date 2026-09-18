import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { isPatientOnly } from "../../common/utils/permissions.util";
import { CreateServiceDto, UpdateServiceDto } from "./dto/catalog.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Arquivados só aparecem para a equipe, quando pedido explicitamente. */
  async services(user: AuthUser, includeInactive: boolean) {
    const where: Prisma.ServiceWhereInput = { clinicId: user.clinicId };
    if (!includeInactive || isPatientOnly(user)) where.active = true;
    const rows = await this.prisma.service.findMany({ where, orderBy: { name: "asc" } });
    return rows.map(mapService);
  }

  async professionals(user: AuthUser) {
    const rows = await this.prisma.professional.findMany({
      where: { clinicId: user.clinicId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.user.name,
      cro: p.cro,
      specialty: p.specialty,
    }));
  }

  async createService(user: AuthUser, dto: CreateServiceDto) {
    const created = await this.prisma.service.create({
      data: {
        clinicId: user.clinicId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        durationMin: dto.durationMin,
        priceCents: dto.priceCents,
      },
    });
    await this.audit(user, "CREATE", created.id);
    return mapService(created);
  }

  async updateService(user: AuthUser, id: string, dto: UpdateServiceDto) {
    await this.findOwn(user, id);
    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        durationMin: dto.durationMin,
        priceCents: dto.priceCents,
        active: dto.active,
      },
    });
    await this.audit(user, "UPDATE", updated.id);
    return mapService(updated);
  }

  /**
   * Serviço já usado em consultas é arquivado em vez de apagado, para não
   * perder o histórico do paciente. Sem histórico, o registro é removido.
   */
  async removeService(user: AuthUser, id: string) {
    await this.findOwn(user, id);
    const used = await this.prisma.appointment.count({ where: { serviceId: id } });
    if (used > 0) {
      const archived = await this.prisma.service.update({
        where: { id },
        data: { active: false },
      });
      await this.audit(user, "ARCHIVE", id);
      return { archived: true, service: mapService(archived) };
    }
    await this.prisma.service.delete({ where: { id } });
    await this.audit(user, "DELETE", id);
    return { archived: false };
  }

  private async findOwn(user: AuthUser, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, clinicId: user.clinicId },
    });
    if (!service) throw new NotFoundException("Serviço não encontrado");
    return service;
  }

  private audit(user: AuthUser, action: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action,
        entity: "Service",
        entityId,
      },
    });
  }
}

function mapService(s: {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  active: boolean;
}) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    active: s.active,
  };
}
