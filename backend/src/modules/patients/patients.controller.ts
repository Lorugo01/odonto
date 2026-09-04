import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreatePatientDto, UpdatePatientChartDto } from "./dto/patients.dto";

@Controller("patients")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  list(@CurrentUser() user: AuthUser) {
    return this.patients.list(user);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.patients.get(user, id);
  }

  @Patch(":id/chart")
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  updateChart(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdatePatientChartDto,
  ) {
    return this.patients.updateChart(user, id, dto);
  }

  @Post()
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(user, dto);
  }
}
