import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ClinicalNotesService } from "./clinical-notes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateClinicalNoteDto, UpdateClinicalNoteDto } from "./dto/clinical-notes.dto";

/**
 * Prontuário (evolução clínica). Acesso restrito ao corpo clínico por sigilo:
 * recepção e paciente não leem nem escrevem. Não há remoção — retificação é
 * feita com uma nova evolução.
 */
@Controller("clinical-notes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("CLINIC_ADMIN", "DENTIST")
export class ClinicalNotesController {
  constructor(private readonly notes: ClinicalNotesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("patientProfileId") patientProfileId: string) {
    return this.notes.list(user, patientProfileId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClinicalNoteDto) {
    return this.notes.create(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.notes.update(user, id, dto);
  }

  @Post(":id/sign")
  sign(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notes.sign(user, id);
  }
}
