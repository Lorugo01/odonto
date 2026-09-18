import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateServiceDto, UpdateServiceDto } from "./dto/catalog.dto";

@Controller("catalog")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("services")
  services(@CurrentUser() user: AuthUser, @Query("includeInactive") includeInactive?: string) {
    return this.catalog.services(user, includeInactive === "true");
  }

  @Get("professionals")
  professionals(@CurrentUser() user: AuthUser) {
    return this.catalog.professionals(user);
  }

  /** O catálogo de tipos de tratamento é mantido pelo administrador. */
  @Post("services")
  @Roles("CLINIC_ADMIN")
  createService(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto) {
    return this.catalog.createService(user, dto);
  }

  @Patch("services/:id")
  @Roles("CLINIC_ADMIN")
  updateService(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.catalog.updateService(user, id, dto);
  }

  @Delete("services/:id")
  @Roles("CLINIC_ADMIN")
  removeService(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.catalog.removeService(user, id);
  }
}
