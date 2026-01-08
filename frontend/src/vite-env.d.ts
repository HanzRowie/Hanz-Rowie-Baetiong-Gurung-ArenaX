/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ACCESS_TOKEN_KEY: string;
  readonly VITE_REFRESH_TOKEN_KEY: string;
  readonly VITE_ENABLE_SOCIAL_LOGIN: string;
  readonly VITE_ENABLE_TWO_FACTOR_AUTH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
