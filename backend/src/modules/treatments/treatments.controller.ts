import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { TreatmentsService } from "./treatments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpsertTreatmentDto } from "./dto/treatments.dto";

@Controller("treatments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TreatmentsController {
  constructor(private readonly treatments: TreatmentsService) {}

  /** Tela de configuração: catálogo + ajustes do profissional. */
  @Get()
  @Roles("CLINIC_ADMIN", "DENTIST")
  list(@CurrentUser() user: AuthUser, @Query("professionalId") professionalId?: string) {
    return this.treatments.list(user, professionalId);
  }

  /** Lista usada na solicitação de consulta; visível também ao paciente. */
  @Get("offered")
  offered(@CurrentUser() user: AuthUser, @Query("professionalId") professionalId: string) {
    return this.treatments.offered(user, professionalId);
  }

  @Put()
  @Roles("CLINIC_ADMIN", "DENTIST")
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertTreatmentDto) {
    return this.treatments.upsert(user, dto);
  }

  @Delete(":serviceId")
  @Roles("CLINIC_ADMIN", "DENTIST")
  remove(
    @CurrentUser() user: AuthUser,
    @Param("serviceId") serviceId: string,
    @Query("professionalId") professionalId?: string,
  ) {
    return this.treatments.remove(user, serviceId, professionalId);
  }
}
