import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { TeamService } from "./team.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateTeamMemberDto, SetRolesDto, UpdateTeamMemberDto } from "./dto/team.dto";

/** Gestão de acessos da clínica: apenas o administrador altera papéis. */
@Controller("team")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("CLINIC_ADMIN")
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.team.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamMemberDto) {
    return this.team.create(user, dto);
  }

  @Patch(":userId/roles")
  setRoles(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
    @Body() dto: SetRolesDto,
  ) {
    return this.team.setRoles(user, userId, dto);
  }

  @Patch(":userId")
  update(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.team.update(user, userId, dto);
  }

  @Delete(":userId")
  remove(@CurrentUser() user: AuthUser, @Param("userId") userId: string) {
    return this.team.remove(user, userId);
  }
}
