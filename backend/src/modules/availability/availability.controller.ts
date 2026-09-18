import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { resolveTreatment } from "../treatments/treatments.util";

/** Situações que ainda ocupam a agenda, incluindo solicitações pendentes. */
const BLOCKING_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
];

const OPEN_HOUR = 8;
const CLOSE_HOUR = 18;

@Controller("availability")
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("professionalId") professionalId: string,
    @Query("serviceId") serviceId: string,
    @Query("date") date: string,
  ) {
    if (!professionalId || !serviceId) {
      throw new BadRequestException("Informe o profissional e o tratamento");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
      throw new BadRequestException("Data inválida");
    }

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, clinicId: user.clinicId, active: true },
    });
    if (!service) throw new BadRequestException("Tratamento indisponível");

    const professional = await this.prisma.professional.findFirst({
      where: { id: professionalId, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!professional) throw new BadRequestException("Profissional inválido");

    // A duração do encaixe é a do tratamento do dentista, com queda para o catálogo.
    const override = await this.prisma.professionalService.findUnique({
      where: { professionalId_serviceId: { professionalId, serviceId } },
    });
    const treatment = resolveTreatment(service, override ?? null);

    const day = new Date(`${date}T00:00:00`);
    const open = new Date(day);
    open.setHours(OPEN_HOUR, 0, 0, 0);
    const close = new Date(day);
    close.setHours(CLOSE_HOUR, 0, 0, 0);

    const existing = await this.prisma.appointment.findMany({
      where: {
        clinicId: user.clinicId,
        professionalId,
        deletedAt: null,
        status: { in: BLOCKING_STATUSES },
        startsAt: { gte: open, lt: close },
      },
      select: { startsAt: true, endsAt: true },
    });

    const duration = treatment.durationMin * 60_000;
    const slots: Array<{ startsAt: string; endsAt: string }> = [];
    for (let t = open.getTime(); t + duration <= close.getTime(); t += duration) {
      const startsAt = new Date(t);
      const endsAt = new Date(t + duration);
      const busy = existing.some((a) => a.startsAt < endsAt && a.endsAt > startsAt);
      if (!busy) slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
    }
    return slots;
  }
}
