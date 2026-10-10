const EMAIL = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi;
const PHONE = /(?:\+?\s*852[\s\-]*)?(?:\(?\d{4}\)?[\s\-]\d{4})/g;

export function redactContacts(s: string): string {
  if (!s) return "";
  let out = s.replace(EMAIL, "").replace(PHONE, "");
  return out
    .split("\n")
    .map((line) => line.split(/\s+/).filter(Boolean).join(" "))
    .filter((line) => line.length > 0)
    .join("\n");
}
