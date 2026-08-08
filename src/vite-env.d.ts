/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_SPREADSHEET_ID?: string;
  readonly VITE_DEFAULT_APPS_SCRIPT_URL?: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
