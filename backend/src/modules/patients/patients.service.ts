import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { CreatePatientDto, UpdatePatientChartDto } from "./dto/patients.dto";
import { sanitizeOdontogram } from "./odontogram.sanitizer";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    if (user.role === "PATIENT") throw new ForbiddenException();
    const links = await this.prisma.clinicPatient.findMany({
      where: { clinicId: user.clinicId, deletedAt: null, status: "ACTIVE" },
      include: { patient: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return links.map((l) => mapPatient(l.patient));
  }

  async get(user: AuthUser, id: string) {
    const profile = await this.assertPatientAccess(user, id);
    const appointments = await this.prisma.appointment.findMany({
      where: { clinicId: user.clinicId, patientProfileId: id, deletedAt: null },
      include: {
        professional: { include: { user: true } },
        service: true,
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });
    const documents = await this.prisma.document.findMany({
      where: { clinicId: user.clinicId, patientProfileId: id },
      orderBy: { createdAt: "desc" },
    });
    const chart = await this.getOrCreateChart(user.clinicId, id);
    return {
      patient: mapPatient(profile),
      chart: mapChart(chart, profile),
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt.toISOString(),
        status: a.status,
        professional: { name: a.professional.user.name },
        service: { name: a.service.name },
      })),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        url: d.url,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async updateChart(user: AuthUser, id: string, dto: UpdatePatientChartDto) {
    if (user.role === "PATIENT") throw new ForbiddenException();
    const profile = await this.assertPatientAccess(user, id);

    if (dto.name && dto.name.trim().length >= 2) {
      await this.prisma.user.update({
        where: { id: profile.userId },
        data: { name: dto.name.trim() },
      });
    }
    if (dto.birthDate !== undefined) {
      await this.prisma.patientProfile.update({
        where: { id },
        data: { birthDate: dto.birthDate ? new Date(dto.birthDate) : null },
      });
    }
    if (dto.phoneMobile !== undefined || dto.phoneHome !== undefined) {
      await this.prisma.patientProfile.update({
        where: { id },
        data: {
          phone: dto.phoneMobile ?? dto.phoneHome ?? profile.phone,
        },
      });
    }

    const chart = await this.getOrCreateChart(user.clinicId, id);
    const updated = await this.prisma.patientChart.update({
      where: { id: chart.id },
      data: {
        chartNumber: dto.chartNumber === undefined ? undefined : dto.chartNumber,
        maritalStatus: dto.maritalStatus === undefined ? undefined : dto.maritalStatus,
        phoneHome: dto.phoneHome === undefined ? undefined : dto.phoneHome,
        phoneWork: dto.phoneWork === undefined ? undefined : dto.phoneWork,
        phoneMobile: dto.phoneMobile === undefined ? undefined : dto.phoneMobile,
        address: dto.address === undefined ? undefined : dto.address,
        insurance: dto.insurance === undefined ? undefined : dto.insurance,
        referredBy: dto.referredBy === undefined ? undefined : dto.referredBy,
        allergyAntibiotic: dto.allergyAntibiotic,
        allergyAnesthetic: dto.allergyAnesthetic,
        allergyDetails: dto.allergyDetails === undefined ? undefined : dto.allergyDetails,
        medSensitivity: dto.medSensitivity === undefined ? undefined : dto.medSensitivity,
        medSensitivityDetails:
          dto.medSensitivityDetails === undefined ? undefined : dto.medSensitivityDetails,
        highBloodPressure: dto.highBloodPressure === undefined ? undefined : dto.highBloodPressure,
        highBloodPressureDetails:
          dto.highBloodPressureDetails === undefined ? undefined : dto.highBloodPressureDetails,
        takingMedication: dto.takingMedication === undefined ? undefined : dto.takingMedication,
        takingMedicationDetails:
          dto.takingMedicationDetails === undefined ? undefined : dto.takingMedicationDetails,
        healthProblems: dto.healthProblems === undefined ? undefined : dto.healthProblems,
        healthProblemsDetails:
          dto.healthProblemsDetails === undefined ? undefined : dto.healthProblemsDetails,
        observations: dto.observations === undefined ? undefined : dto.observations,
        odontogram:
          dto.odontogram === undefined
            ? undefined
            : (sanitizeOdontogram(dto.odontogram) as unknown as Prisma.InputJsonValue),
        treatmentPlan: dto.treatmentPlan === undefined ? undefined : dto.treatmentPlan,
        planDate:
          dto.planDate === undefined
            ? undefined
            : dto.planDate
              ? new Date(dto.planDate)
              : null,
      },
    });

    const fresh = await this.prisma.patientProfile.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });
    return mapChart(updated, fresh);
  }

  async create(user: AuthUser, dto: CreatePatientDto) {
    if (user.role === "PATIENT") throw new ForbiddenException();
    const email = dto.email.toLowerCase();
    const passwordHash = await bcrypt.hash(dto.senha ?? "senha123", 10);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    const result = await this.prisma.$transaction(async (tx) => {
      const u =
        existing ??
        (await tx.user.create({
          data: { email, name: dto.name, passwordHash, consentAt: new Date() },
        }));
      const profile =
        (await tx.patientProfile.findUnique({ where: { userId: u.id } })) ??
        (await tx.patientProfile.create({ data: { userId: u.id, phone: dto.phone } }));
      await tx.userClinicRole.upsert({
        where: { userId_clinicId_role: { userId: u.id, clinicId: user.clinicId, role: "PATIENT" } },
        create: { userId: u.id, clinicId: user.clinicId, role: "PATIENT" },
        update: {},
      });
      await tx.clinicPatient.upsert({
        where: { clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId: profile.id } },
        create: { clinicId: user.clinicId, patientProfileId: profile.id },
        update: { deletedAt: null, status: "ACTIVE" },
      });
      await tx.patientChart.upsert({
        where: {
          clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId: profile.id },
        },
        create: {
          clinicId: user.clinicId,
          patientProfileId: profile.id,
          phoneMobile: dto.phone,
        },
        update: {},
      });
      return tx.patientProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: { user: true },
      });
    });
    return mapPatient(result);
  }

  private async assertPatientAccess(user: AuthUser, id: string) {
    const profile = await this.prisma.patientProfile.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException();
    if (user.role === "PATIENT" && profile.userId !== user.userId) {
      throw new ForbiddenException();
    }
    const link = await this.prisma.clinicPatient.findUnique({
      where: { clinicId_patientProfileId: { clinicId: user.clinicId, patientProfileId: id } },
    });
    if (!link) throw new NotFoundException();
    return profile;
  }

  private async getOrCreateChart(clinicId: string, patientProfileId: string) {
    return this.prisma.patientChart.upsert({
      where: { clinicId_patientProfileId: { clinicId, patientProfileId } },
      create: { clinicId, patientProfileId },
      update: {},
    });
  }
}

function mapPatient(p: {
  id: string;
  phone: string | null;
  birthDate: Date | null;
  user: { name: string; email: string };
}) {
  return {
    id: p.id,
    name: p.user.name,
    email: p.user.email,
    phone: p.phone,
    birthDate: p.birthDate?.toISOString().slice(0, 10) ?? null,
  };
}

function mapChart(
  chart: {
    id: string;
    chartNumber: string | null;
    maritalStatus: string | null;
    phoneHome: string | null;
    phoneWork: string | null;
    phoneMobile: string | null;
    address: string | null;
    insurance: string | null;
    referredBy: string | null;
    allergyAntibiotic: boolean;
    allergyAnesthetic: boolean;
    allergyDetails: string | null;
    medSensitivity: boolean | null;
    medSensitivityDetails: string | null;
    highBloodPressure: boolean | null;
    highBloodPressureDetails: string | null;
    takingMedication: boolean | null;
    takingMedicationDetails: string | null;
    healthProblems: boolean | null;
    healthProblemsDetails: string | null;
    observations: string | null;
    odontogram: Prisma.JsonValue;
    treatmentPlan: string | null;
    planDate: Date | null;
  },
  profile: { birthDate: Date | null; phone: string | null; user: { name: string; email: string } },
) {
  return {
    id: chart.id,
    name: profile.user.name,
    email: profile.user.email,
    birthDate: profile.birthDate?.toISOString().slice(0, 10) ?? null,
    chartNumber: chart.chartNumber,
    maritalStatus: chart.maritalStatus,
    phoneHome: chart.phoneHome,
    phoneWork: chart.phoneWork,
    phoneMobile: chart.phoneMobile ?? profile.phone,
    address: chart.address,
    insurance: chart.insurance,
    referredBy: chart.referredBy,
    allergyAntibiotic: chart.allergyAntibiotic,
    allergyAnesthetic: chart.allergyAnesthetic,
    allergyDetails: chart.allergyDetails,
    medSensitivity: chart.medSensitivity,
    medSensitivityDetails: chart.medSensitivityDetails,
    highBloodPressure: chart.highBloodPressure,
    highBloodPressureDetails: chart.highBloodPressureDetails,
    takingMedication: chart.takingMedication,
    takingMedicationDetails: chart.takingMedicationDetails,
    healthProblems: chart.healthProblems,
    healthProblemsDetails: chart.healthProblemsDetails,
    observations: chart.observations,
    odontogram: (chart.odontogram as Record<string, unknown>) ?? {},
    treatmentPlan: chart.treatmentPlan,
    planDate: chart.planDate?.toISOString().slice(0, 10) ?? null,
  };
}
