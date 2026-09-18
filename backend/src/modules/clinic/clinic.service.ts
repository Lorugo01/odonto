import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { UpdateClinicSettingsDto } from "./dto/clinic.dto";
import {
  ClinicBrandRow,
  clinicSettingsDto,
  isSafeLogoUrl,
  loadClinicBranding,
  normalizeBrandColor,
  publicClinicDto,
} from "./clinic.util";

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  /** Marca pública (login / landing da clínica). Sem dados internos. */
  async publicBranding(slug: string) {
    const clinic = await this.prisma.clinic.findFirst({
      where: { slug: slug.trim().toLowerCase(), status: "ACTIVE" },
    });
    if (!clinic) throw new NotFoundException("Clínica não encontrada");
    return publicClinicDto(clinicSettingsDto(clinic));
  }

  async getSettings(user: AuthUser) {
    const clinic = await this.loadOrFallback({ id: user.clinicId });
    if (!clinic) throw new NotFoundException("Clínica não encontrada");
    return clinic;
  }

  async updateSettings(user: AuthUser, dto: UpdateClinicSettingsDto) {
    if (dto.logoUrl !== undefined && dto.logoUrl !== null && !isSafeLogoUrl(dto.logoUrl)) {
      throw new BadRequestException("Logomarca inválida. Use PNG, JPEG ou WebP.");
    }

    const current = await this.loadOrFallback({ id: user.clinicId });
    if (!current) throw new NotFoundException("Clínica não encontrada");

    const next: ClinicBrandRow = {
      ...current,
      name: dto.name?.trim() || current.name,
      legalName: dto.legalName === undefined ? current.legalName : dto.legalName,
      cnpj: dto.cnpj === undefined ? current.cnpj : dto.cnpj,
      phone: dto.phone === undefined ? current.phone : dto.phone,
      email: dto.email === undefined ? current.email : dto.email?.toLowerCase() ?? null,
      address: dto.address === undefined ? current.address : dto.address,
      website: dto.website === undefined ? current.website : dto.website,
      logoUrl: dto.logoUrl === undefined ? current.logoUrl : dto.logoUrl,
      primaryColor: dto.primaryColor ? normalizeBrandColor(dto.primaryColor) : current.primaryColor,
      documentFooter: dto.documentFooter === undefined ? current.documentFooter : dto.documentFooter,
    };

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "Clinic" SET
        name = ${next.name},
        "legalName" = ${next.legalName},
        cnpj = ${next.cnpj},
        phone = ${next.phone},
        email = ${next.email},
        address = ${next.address},
        website = ${next.website},
        "logoUrl" = ${next.logoUrl},
        "primaryColor" = ${next.primaryColor},
        "documentFooter" = ${next.documentFooter},
        "updatedAt" = NOW()
      WHERE id = ${user.clinicId}
    `);

    await this.prisma.auditLog.create({
      data: {
        clinicId: user.clinicId,
        userId: user.userId,
        action: "UPDATE",
        entity: "ClinicBranding",
        entityId: current.id,
      },
    });
    return clinicSettingsDto(next);
  }

  private async loadOrFallback(where: { id: string } | { slug: string }) {
    const clinic =
      "id" in where
        ? await this.prisma.clinic.findUnique({ where: { id: where.id } })
        : await this.prisma.clinic.findFirst({
            where: { slug: where.slug, status: "ACTIVE" },
          });
    if (!clinic) return null;
    try {
      const branded = await loadClinicBranding(
        this.prisma,
        "id" in where ? { id: where.id } : { slug: where.slug },
      );
      return branded ?? clinicSettingsDto(clinic);
    } catch {
      return clinicSettingsDto(clinic);
    }
  }
}
