import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  GOPUR_AUTH: KVNamespace;
  JWT_SECRET?: string;
  JWT_EXPIRY_HOURS?: string;
  OTP_EXPIRY_MINUTES?: string;
  OTP_LENGTH?: string;
  ADMIN_EMAILS?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  BREVO_API_KEY?: string;
  MAIL_PROVIDER?: string;
};
