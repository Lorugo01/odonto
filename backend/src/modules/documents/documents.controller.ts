import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateDocumentDto, IssueDocumentDto } from "./dto/documents.dto";

@Controller("documents")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("patientProfileId") patientProfileId?: string) {
    return this.documents.list(user, patientProfileId);
  }

  /** Emissão por modelo. A restrição por tipo é aplicada no serviço. */
  @Post("issue")
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  issue(@CurrentUser() user: AuthUser, @Body() dto: IssueDocumentDto) {
    return this.documents.issue(user, dto);
  }

  @Post()
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  /** O paciente só acessa os próprios documentos (validado no serviço). */
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.documents.get(user, id);
  }
}
