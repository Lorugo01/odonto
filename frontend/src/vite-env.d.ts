/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  /** Slug da clínica usado no login quando não há `?clinica=` na URL. */
  readonly VITE_CLINIC_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
