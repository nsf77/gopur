import type { Bindings } from "./types";

export type AuthConfig = {
  jwtSecret: string;
  jwtExpirySeconds: number;
  otpExpiryMinutes: number;
  otpLength: number;
  adminEmails: string[];
  emailFrom: string;
  emailFromName: string;
  brevoKey: string;
  mailProvider: string;
};

export function authConfig(env: Bindings): AuthConfig {
  const hours = Number(env.JWT_EXPIRY_HOURS ?? "168");
  return {
    jwtSecret: env.JWT_SECRET || "change-me-in-production-use-long-random-string",
    jwtExpirySeconds: (Number.isFinite(hours) ? hours : 168) * 3600,
    otpExpiryMinutes: Number(env.OTP_EXPIRY_MINUTES ?? "10") || 10,
    otpLength: Number(env.OTP_LENGTH ?? "6") || 6,
    adminEmails: (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    emailFrom: env.EMAIL_FROM ?? "noreply@gopur.hk",
    emailFromName: env.EMAIL_FROM_NAME ?? "Gopur",
    brevoKey: env.BREVO_API_KEY ?? "",
    mailProvider: (env.MAIL_PROVIDER ?? "log").toLowerCase(),
  };
}
