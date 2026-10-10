export function normalizeURL(raw: string): string {
  raw = raw.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return raw;
  return "https://" + raw;
}

function datasetPage(host: string, path: string): boolean {
  host = host.toLowerCase();
  path = path.toLowerCase();
  if (host === "data.gov.hk" || host.endsWith(".data.gov.hk")) return true;
  if (path.includes("/datagovhk/")) return true;
  if (path.includes("activity-prog/file")) return true;
  if (host.includes("digitalpolicy.gov.hk") && path.includes("/open_data/")) return true;
  return false;
}

export function cleanLink(raw: string): string {
  raw = raw.trim();
  if (!raw) return "";
  raw = raw.replaceAll("&&", "&");
  raw = normalizeURL(raw);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }
  if (!parsed.host) return "";
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
  if (datasetPage(parsed.hostname, parsed.pathname)) return "";
  return raw;
}
