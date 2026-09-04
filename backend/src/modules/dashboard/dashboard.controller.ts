import { AppointmentStatus } from "@prisma/client";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("summary")
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  async summary(@CurrentUser() user: AuthUser) {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const weekStart = startOfDay(addDays(new Date(), -6));
    const today = await this.prisma.appointment.findMany({
      where: { clinicId: user.clinicId, deletedAt: null, startsAt: { gte: start, lte: end } },
    });
    const week = await this.prisma.appointment.findMany({
      where: { clinicId: user.clinicId, deletedAt: null, startsAt: { gte: weekStart, lte: end } },
    });
    const todayCount = today.filter((a) => a.status !== "CANCELLED").length;
    const noShowCount = today.filter((a) => a.status === "NO_SHOW").length;
    const occupancyPercent = Math.min(
      100,
      Math.round((today.filter((a) => ["SCHEDULED", "CONFIRMED", "COMPLETED"].includes(a.status)).length / 10) * 100),
    );
    const statuses: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];
    const byStatus = statuses.map((status) => ({
      status,
      count: today.filter((a) => a.status === status).length,
    }));
    const weekCounts = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(weekStart, i);
      const key = d.toISOString().slice(0, 10);
      return {
        day: key,
        count: week.filter((a) => a.status !== "CANCELLED" && a.startsAt.toISOString().slice(0, 10) === key).length,
      };
    });
    return { todayCount, noShowCount, occupancyPercent, byStatus, weekCounts };
  }

  @Get("patient-home")
  @Roles("PATIENT")
  async patientHome(@CurrentUser() user: AuthUser) {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) return { nextAppointment: null, recentDocuments: [] };
    const next = await this.prisma.appointment.findFirst({
      where: {
        clinicId: user.clinicId,
        patientProfileId: profile.id,
        deletedAt: null,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startsAt: { gte: new Date() },
      },
      include: {
        professional: { include: { user: true } },
        service: true,
      },
      orderBy: { startsAt: "asc" },
    });
    const docs = await this.prisma.document.findMany({
      where: { clinicId: user.clinicId, patientProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return {
      nextAppointment: next
        ? {
            id: next.id,
            startsAt: next.startsAt.toISOString(),
            status: next.status,
            professional: { name: next.professional.user.name },
            service: { name: next.service.name },
          }
        : null,
      recentDocuments: docs.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
