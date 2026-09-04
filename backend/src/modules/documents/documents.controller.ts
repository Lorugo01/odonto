import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CreateDocumentDto, DocumentsService } from "./documents.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthUser, CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("documents")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("patientProfileId") patientProfileId?: string) {
    return this.documents.list(user, patientProfileId);
  }

  @Post()
  @Roles("CLINIC_ADMIN", "DENTIST", "RECEPTION")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }
}
