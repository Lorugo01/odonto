import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Palette, Save } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/auth";
import { btn } from "../utils/buttonStyles";
import {
  ClinicBranding,
  applyBrandColor,
  brandTokens,
  normalizeBrandColor,
} from "../utils/brand";
import { ClinicMark } from "../components/brand/ClinicMark";
import { Card, CardHeader, ErrorState, Field, Input, Textarea, useToast } from "../components/ui";

const PRESETS = ["#0D9488", "#0F766E", "#2563EB", "#4F46E5", "#DB2777", "#D97706", "#059669", "#1E3A5F"];
const MAX_LOGO_BYTES = 220 * 1024;

const emptyForm: ClinicBranding = {
  id: "",
  name: "",
  slug: "",
  timezone: "America/Sao_Paulo",
  legalName: null,
  cnpj: null,
  phone: null,
  email: null,
  address: null,
  website: null,
  logoUrl: null,
  primaryColor: "#0D9488",
  documentFooter: null,
};

function asText(value: string | null | undefined) {
  return value ?? "";
}

/** Tela comercial: o administrador define a cara da clínica (logo, cor e timbre). */
export default function Configuracoes() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState<ClinicBranding>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");

  useEffect(() => {
    api
      .get<ClinicBranding>("/clinic/settings")
      .then((r) => setForm(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    applyBrandColor(form.primaryColor);
  }, [form.primaryColor]);

  const tokens = useMemo(() => brandTokens(form.primaryColor), [form.primaryColor]);

  function patch<K extends keyof ClinicBranding>(key: K, value: ClinicBranding[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onColor(value: string) {
    const hex = value.startsWith("#") ? value : `#${value}`;
    patch("primaryColor", normalizeBrandColor(hex.length === 7 ? hex : form.primaryColor));
  }

  function onLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLogoError("");
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      setLogoError("Use PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("A logomarca deve ter no máximo 220 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        setLogoError("Não foi possível ler a imagem.");
        return;
      }
      patch("logoUrl", result);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch<ClinicBranding>("/clinic/settings", {
        name: form.name.trim(),
        legalName: form.legalName,
        cnpj: form.cnpj,
        phone: form.phone,
        email: form.email,
        address: form.address,
        website: form.website,
        logoUrl: form.logoUrl,
        primaryColor: normalizeBrandColor(form.primaryColor),
        documentFooter: form.documentFooter,
      });
      setForm(data);
      applyBrandColor(data.primaryColor);
      if (user) setUser({ ...user, clinicName: data.name, clinic: data });
      toast.success("Identidade da clínica atualizada");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Carregando identidade da clínica...</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader
            icon={<Palette size={18} />}
            title="Identidade visual"
            subtitle="Essa cara aparece no login, no menu e no timbre dos documentos."
          />
          {error ? <ErrorState message={error} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da clínica" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
            </Field>
            <Field label="Razão social">
              <Input
                value={asText(form.legalName)}
                onChange={(e) => patch("legalName", e.target.value || null)}
                placeholder="Como no CNPJ"
              />
            </Field>
            <Field label="CNPJ">
              <Input
                value={asText(form.cnpj)}
                onChange={(e) => patch("cnpj", e.target.value || null)}
                placeholder="00.000.000/0000-00"
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={asText(form.phone)}
                onChange={(e) => patch("phone", e.target.value || null)}
                placeholder="(11) 0000-0000"
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={asText(form.email)}
                onChange={(e) => patch("email", e.target.value || null)}
                placeholder="contato@clinica.com"
              />
            </Field>
            <Field label="Endereço" className="sm:col-span-2">
              <Input
                value={asText(form.address)}
                onChange={(e) => patch("address", e.target.value || null)}
                placeholder="Rua, número, bairro, cidade"
              />
            </Field>
            <Field label="Site" className="sm:col-span-2">
              <Input
                value={asText(form.website)}
                onChange={(e) => patch("website", e.target.value || null)}
                placeholder="https://"
              />
            </Field>
            <Field label="Rodapé dos documentos" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={asText(form.documentFooter)}
                onChange={(e) => patch("documentFooter", e.target.value || null)}
                placeholder="CRO da clínica, slogan, aviso legal..."
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Logomarca" subtitle="PNG, JPEG ou WebP · até 220 KB." />
          <div className="flex flex-wrap items-center gap-4">
            <ClinicMark name={form.name || "Clínica"} logoUrl={form.logoUrl} size={64} />
            <div className="flex flex-col gap-2">
              <label className={`${btn.secondary} cursor-pointer`}>
                <ImagePlus size={16} />
                Enviar logo
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onLogo} />
              </label>
              {form.logoUrl ? (
                <button type="button" className={btn.ghostSm} onClick={() => patch("logoUrl", null)}>
                  Remover logo
                </button>
              ) : null}
              {logoError ? <p className="text-xs text-danger">{logoError}</p> : null}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Cor da marca" subtitle="Botões, menu ativo e destaques seguem esta cor." />
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={normalizeBrandColor(form.primaryColor)}
              onChange={(e) => onColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
              aria-label="Cor da marca"
            />
            <Input
              value={form.primaryColor}
              onChange={(e) => onColor(e.target.value)}
              className="w-28 font-mono uppercase"
              maxLength={7}
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  title={hex}
                  onClick={() => patch("primaryColor", hex)}
                  className={`h-7 w-7 rounded-full border ${
                    form.primaryColor.toUpperCase() === hex ? "ring-2 ring-offset-2 ring-ink" : "border-line"
                  }`}
                  style={{ background: hex }}
                  aria-label={`Usar ${hex}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={btn.primary}>Botão principal</span>
            <span className="rounded-lg bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">Fundo suave</span>
            <span className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted" style={{ color: tokens.hover }}>
              Hover {tokens.hover}
            </span>
          </div>
        </Card>

        <div className="flex justify-end">
          <button type="submit" className={btn.primaryLg} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar identidade
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Menu" subtitle="Como o paciente e a equipe veem a marca." />
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas p-3">
            <ClinicMark name={form.name || "Clínica"} logoUrl={form.logoUrl} size={36} />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{form.name || "Nome da clínica"}</p>
              <p className="truncate text-xs text-ink-muted">{form.slug || "slug"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Timbre" subtitle="Cabeçalho das receitas e atestados." />
          <div className="rounded-lg border border-ink/20 bg-surface p-3">
            <div className="flex items-start gap-2 border-b border-ink pb-2">
              <ClinicMark name={form.name || "Clínica"} logoUrl={form.logoUrl} size={40} />
              <div className="min-w-0 text-[11px] leading-snug text-ink">
                <p className="text-sm font-bold">{form.name || "Nome da clínica"}</p>
                {form.legalName ? <p>{form.legalName}</p> : null}
                {form.cnpj ? <p>CNPJ {form.cnpj}</p> : null}
                {form.address ? <p>{form.address}</p> : null}
                <p className="text-ink-muted">
                  {[form.phone, form.email].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Receita odontológica
            </p>
            {form.documentFooter ? (
              <p className="mt-4 text-center text-[10px] text-ink-soft">{form.documentFooter}</p>
            ) : null}
          </div>
        </Card>
      </div>
    </form>
  );
}
