import { useEffect } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import {
  ClinicBranding,
  ClinicPublic,
  applyBrandColor,
  rememberClinicSlug,
  resolveClinicSlug,
} from "../../utils/brand";

/**
 * Aplica a cor/nome da clínica em toda a sessão.
 * Logado: usa a identidade gravada no usuário e recarrega de /clinic/settings.
 * Login: usa a marca pública do slug (?clinica= ou última visita).
 */
export function BrandTheme() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const publicClinic = useAuthStore((s) => s.publicClinic);
  const setUser = useAuthStore((s) => s.setUser);
  const setPublicClinic = useAuthStore((s) => s.setPublicClinic);

  useEffect(() => {
    const brand = user?.clinic ?? publicClinic;
    applyBrandColor(brand?.primaryColor);
    if (brand?.slug) rememberClinicSlug(brand.slug);
    const title = user?.clinicName || brand?.name;
    if (title) document.title = title;
  }, [user?.clinic, user?.clinicName, publicClinic]);

  useEffect(() => {
    if (!token) {
      const slug = resolveClinicSlug();
      api
        .get<ClinicPublic>(`/clinic/public/${encodeURIComponent(slug)}`)
        .then((r) => setPublicClinic(r.data))
        .catch(() => applyBrandColor());
      return;
    }
    api
      .get<ClinicBranding>("/clinic/settings")
      .then((r) => {
        const current = useAuthStore.getState().user;
        if (!current) return;
        setUser({ ...current, clinicName: r.data.name, clinic: r.data });
        setPublicClinic({
          name: r.data.name,
          slug: r.data.slug,
          logoUrl: r.data.logoUrl,
          primaryColor: r.data.primaryColor,
        });
      })
      .catch(() => undefined);
  }, [token, setUser, setPublicClinic]);

  return null;
}
