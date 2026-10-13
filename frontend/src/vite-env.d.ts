/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API Gateway base URL (https://{id}.execute-api.{region}.amazonaws.com/{stage}) */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
