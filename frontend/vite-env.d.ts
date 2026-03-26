/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_DRIVE_CLIENT_ID: string;
  readonly VITE_GOOGLE_DRIVE_API_KEY: string;
  readonly VITE_GOOGLE_DRIVE_APP_ID: string;
  readonly VITE_RUN_SUBPATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
