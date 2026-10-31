import type { D1Database, DurableObjectNamespace, KVNamespace } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  GOPUR_AUTH: KVNamespace;
  CHAT_HUB: DurableObjectNamespace;
  CHAT_RELAY_TTL_SECONDS?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  JWT_SECRET?: string;
  JWT_EXPIRY_HOURS?: string;
  OTP_EXPIRY_MINUTES?: string;
  OTP_LENGTH?: string;
  ADMIN_EMAILS?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  BREVO_API_KEY?: string;
  MAIL_PROVIDER?: string;
  IMPORT_TOKEN?: string;
  IMPORT_RUN_TIMEOUT?: string;
  IMPORT_SOURCE_TIMEOUT?: string;
};
