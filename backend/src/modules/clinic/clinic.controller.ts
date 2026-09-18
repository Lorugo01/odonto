import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ClinicService } from "./clinic.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateClinicSettingsDto } from "./dto/clinic.dto";

@Controller("clinic")
export class ClinicController {
  constructor(private readonly clinic: ClinicService) {}

  /** Identidade pública da clínica, usada na tela de login. */
  @Get("public/:slug")
  publicBranding(@Param("slug") slug: string) {
    return this.clinic.publicBranding(slug);
  }

  @Get("settings")
  @UseGuards(JwtAuthGuard)
  getSettings(@CurrentUser() user: AuthUser) {
    return this.clinic.getSettings(user);
  }

  @Patch("settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLINIC_ADMIN")
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateClinicSettingsDto) {
    return this.clinic.updateSettings(user, dto);
  }
}
