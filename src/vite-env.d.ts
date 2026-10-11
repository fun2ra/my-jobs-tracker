/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_APPS_SCRIPT_ID?: string;
  readonly VITE_ALLOWED_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
