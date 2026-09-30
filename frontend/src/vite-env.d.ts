/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_CLEARLC_MODE?: "DEMO" | "LIVE";
  readonly VITE_CLEARLC_CONTRACT_ADDRESS?: string;
  readonly VITE_CLEARLC_CONTRACT_SHA256?: string;
  readonly VITE_CLEARLC_DEPLOYMENT_TX?: string;
  readonly VITE_CLEARLC_RUNNER?: string;
  readonly VITE_CLEARLC_SCHEMA_METHOD_COUNT?: string;
  readonly VITE_CLEARLC_FEE_PROFILE_COVERAGE?: string;
  readonly VITE_CLEARLC_FEE_PROFILE_SHA256?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
