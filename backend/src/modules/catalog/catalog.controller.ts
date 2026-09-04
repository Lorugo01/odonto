import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("catalog")
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("services")
  services(@CurrentUser() user: AuthUser) {
    return this.prisma.service.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { name: "asc" },
    });
  }

  @Get("professionals")
  async professionals(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.professional.findMany({
      where: { clinicId: user.clinicId },
      include: { user: true },
    });
    return rows.map((p) => ({ id: p.id, name: p.user.name, cro: p.cro, specialty: p.specialty }));
  }
}
