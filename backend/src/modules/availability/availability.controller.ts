import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";

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
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, clinicId: user.clinicId },
    });
    if (!service) throw new BadRequestException("Serviço inválido");
    const day = new Date(`${date}T00:00:00`);
    const open = new Date(day);
    open.setHours(8, 0, 0, 0);
    const close = new Date(day);
    close.setHours(18, 0, 0, 0);
    const existing = await this.prisma.appointment.findMany({
      where: {
        clinicId: user.clinicId,
        professionalId,
        deletedAt: null,
        status: { notIn: ["CANCELLED"] },
        startsAt: { gte: open, lt: close },
      },
    });
    const duration = service.durationMin * 60_000;
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
