import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { isPatientOnly } from "../../common/utils/permissions.util";
import { PrismaService } from "../../prisma/prisma.service";
import { resolveTreatment } from "../treatments/treatments.util";
import { mergeWeekHours } from "../../common/utils/hours.util";

/** Situações que ainda ocupam a agenda (pedido, marcado ou confirmado). */
const BLOCKING_STATUSES: AppointmentStatus[] = ["REQUESTED", "SCHEDULED", "CONFIRMED"];

export type SlotStatus = "free" | "busy" | "mine";

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

    const override = await this.prisma.professionalService.findUnique({
      where: { professionalId_serviceId: { professionalId, serviceId } },
    });
    const treatment = resolveTreatment(service, override ?? null);

    const day = new Date(`${date}T00:00:00`);
    const hourRows = await this.prisma.professionalHours.findMany({
      where: { professionalId },
    });
    const dayHours = mergeWeekHours(hourRows)[day.getDay()];

    const loadMine = async (open: Date, close: Date) => {
      if (!isPatientOnly(user)) return [];
      const profile = await this.prisma.patientProfile.findUnique({
        where: { userId: user.userId },
        select: { id: true },
      });
      if (!profile) return [];
      const rows = await this.prisma.appointment.findMany({
        where: {
          clinicId: user.clinicId,
          patientProfileId: profile.id,
          deletedAt: null,
          status: { in: BLOCKING_STATUSES },
          startsAt: { gte: open, lt: close },
        },
        include: {
          professional: { include: { user: { select: { name: true } } } },
          service: { select: { name: true } },
        },
        orderBy: { startsAt: "asc" },
      });
      return rows.map((a) => ({
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        serviceName: a.service.name,
        professionalName: a.professional.user.name,
      }));
    };

    const mapYours = (
      mine: Array<{ startsAt: Date; endsAt: Date; serviceName: string; professionalName: string }>,
    ) =>
      mine.map((a) => ({
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        serviceName: a.serviceName,
        professionalName: a.professionalName,
      }));

    if (!dayHours.enabled) {
      const closedOpen = new Date(day);
      closedOpen.setHours(0, 0, 0, 0);
      const closedClose = new Date(day);
      closedClose.setHours(23, 59, 59, 999);
      const mine = await loadMine(closedOpen, closedClose);
      return { open: false, slots: [], yourDay: mapYours(mine) };
    }

    const open = new Date(day);
    open.setHours(Math.floor(dayHours.startMin / 60), dayHours.startMin % 60, 0, 0);
    const close = new Date(day);
    close.setHours(Math.floor(dayHours.endMin / 60), dayHours.endMin % 60, 0, 0);

    const dentistBusy = await this.prisma.appointment.findMany({
      where: {
        clinicId: user.clinicId,
        professionalId,
        deletedAt: null,
        status: { in: BLOCKING_STATUSES },
        startsAt: { gte: open, lt: close },
      },
      select: { startsAt: true, endsAt: true },
    });

    let mine: Array<{ startsAt: Date; endsAt: Date; serviceName: string; professionalName: string }> =
      await loadMine(open, close);

    const duration = treatment.durationMin * 60_000;
    const now = Date.now();
    const slots: Array<{ startsAt: string; endsAt: string; status: SlotStatus }> = [];

    for (let t = open.getTime(); t + duration <= close.getTime(); t += duration) {
      const startsAt = new Date(t);
      const endsAt = new Date(t + duration);
      const overlaps = (a: { startsAt: Date; endsAt: Date }) =>
        a.startsAt < endsAt && a.endsAt > startsAt;

      let status: SlotStatus = "free";
      if (mine.some(overlaps)) status = "mine";
      else if (dentistBusy.some(overlaps)) status = "busy";
      // Horário já passou: trata como ocupado para não reabrir o clique.
      if (status === "free" && startsAt.getTime() <= now) status = "busy";

      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status,
      });
    }

    return {
      open: true,
      slots,
      yourDay: mapYours(mine),
    };
  }
}
