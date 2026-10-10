export function encodeBase64UrlBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function encodeBase64Url(text: string): string {
  return encodeBase64UrlBytes(new TextEncoder().encode(text));
}

export function decodeBase64UrlBytes(raw: string): Uint8Array {
  const pad = raw.replaceAll("-", "+").replaceAll("_", "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function decodeBase64Url(raw: string): string {
  return new TextDecoder().decode(decodeBase64UrlBytes(raw));
}

export async function sha256Base64Url16(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encodeBase64UrlBytes(new Uint8Array(digest)).slice(0, 16);
}
