/** Catálogo da clínica. */
export type ServiceBase = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  active?: boolean;
};

/** Ajustes do dentista para o tratamento; campos nulos herdam o catálogo. */
export type TreatmentOverride = {
  id: string;
  description: string | null;
  durationMin: number | null;
  priceCents: number | null;
  active: boolean;
} | null;

export type ResolvedTreatment = {
  serviceId: string;
  /** Id do vínculo profissional-serviço, quando o dentista já o configurou. */
  treatmentId: string | null;
  name: string;
  /** Valores efetivos: ajuste do dentista ou, na falta dele, o do catálogo. */
  description: string | null;
  durationMin: number;
  priceCents: number;
  active: boolean;
  /** Valores do catálogo, exibidos como referência na tela de ajuste. */
  catalog: { description: string | null; durationMin: number; priceCents: number };
  /** false quando o administrador arquivou o tipo no catálogo. */
  catalogActive: boolean;
  /**
   * Ajustes brutos do dentista, com `null` onde ele optou por herdar. A tela
   * precisa deles para preservar a personalização ao ativar ou desativar.
   */
  own: { description: string | null; durationMin: number | null; priceCents: number | null } | null;
  customized: boolean;
};

/**
 * Combina o serviço do catálogo com os ajustes do dentista. Deixar um campo em
 * branco no tratamento significa "usar o valor da clínica", e não zero.
 */
export function resolveTreatment(
  service: ServiceBase,
  override: TreatmentOverride,
): ResolvedTreatment {
  return {
    serviceId: service.id,
    treatmentId: override?.id ?? null,
    name: service.name,
    description: override?.description ?? service.description,
    durationMin: override?.durationMin ?? service.durationMin,
    priceCents: override?.priceCents ?? service.priceCents,
    active: override?.active ?? false,
    catalog: {
      description: service.description,
      durationMin: service.durationMin,
      priceCents: service.priceCents,
    },
    catalogActive: service.active !== false,
    own: override
      ? {
          description: override.description,
          durationMin: override.durationMin,
          priceCents: override.priceCents,
        }
      : null,
    customized:
      override != null &&
      (override.description !== null ||
        override.durationMin !== null ||
        override.priceCents !== null),
  };
}
