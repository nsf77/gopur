import type { AuthConfig } from "./config";

export async function sendOTP(cfg: AuthConfig, to: string, code: string): Promise<void> {
  const useBrevo = cfg.mailProvider === "brevo" || !!cfg.brevoKey;
  if (!useBrevo || !cfg.brevoKey) {
    console.log(`email stub: OTP sent from=${cfg.emailFrom} to=${to} code=${code}`);
    return;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": cfg.brevoKey,
    },
    body: JSON.stringify({
      sender: { email: cfg.emailFrom, name: cfg.emailFromName },
      to: [{ email: to }],
      subject: "你的 Gopur 登入驗證碼 / Your Gopur sign-in code",
      textContent: `你的 Gopur 登入驗證碼是 ${code}。\n\nYour Gopur sign-in code is ${code}.\n`,
    }),
  });
  if (!res.ok) throw new Error(`brevo ${res.status}`);
}
