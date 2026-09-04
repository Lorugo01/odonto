import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { HealthController } from "./common/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: "global", ttl: 60000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    AvailabilityModule,
    PatientsModule,
    DocumentsModule,
    DashboardModule,
    CatalogModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
