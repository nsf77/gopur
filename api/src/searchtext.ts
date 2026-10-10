import { present, unmarshal, LOCALE_EN, LOCALE_ZH } from "./i18n";

const MAX_TERMS = 20;
const MAX_PHRASE_RUNES = 20;

export function isHan(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x2e80 && cp <= 0x2e99) ||
    (cp >= 0x2e9b && cp <= 0x2ef3) ||
    (cp >= 0x2f00 && cp <= 0x2fd5) ||
    cp === 0x3005 ||
    cp === 0x3007 ||
    (cp >= 0x3021 && cp <= 0x3029) ||
    (cp >= 0x3038 && cp <= 0x303b) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfad9) ||
    (cp >= 0xfa70 && cp <= 0xfad9)
  );
}

function writeJSON(out: string, raw: string): string {
  const map = unmarshal(raw);
  if (!map) return writeText(out, raw);
  out = writeText(out, map[LOCALE_EN] ?? "");
  out = writeText(out, map[LOCALE_ZH] ?? "");
  const rest = Object.keys(map)
    .filter((k) => k !== LOCALE_EN && k !== LOCALE_ZH)
    .sort();
  for (const k of rest) out = writeText(out, map[k] ?? "");
  return out;
}

function writeText(out: string, value: string): string {
  if (!present(value)) return out;
  for (const ch of value) {
    if (isHan(ch)) out += ` ${ch} `;
    else out += ch;
  }
  return out + " ";
}

export function matchQuery(q: string): { expr: string; ok: boolean } {
  let tokens = tokensOf(q);
  if (tokens.length === 0) return { expr: "", ok: false };
  if (tokens.length > MAX_TERMS) tokens = tokens.slice(0, MAX_TERMS);
  const parts = tokens.map((token) => {
    let quoted = `"${token.replaceAll('"', '""')}"`;
    if (asciiWord(token)) quoted += "*";
    return quoted;
  });
  return { expr: parts.join(" AND "), ok: true };
}

function tokensOf(q: string): string[] {
  const tokens: string[] = [];
  let ascii = "";
  let han: string[] = [];
  const flushASCII = () => {
    if (ascii) {
      tokens.push(ascii);
      ascii = "";
    }
  };
  const flushHan = () => {
    if (han.length === 0) return;
    if (han.length > MAX_PHRASE_RUNES) han = han.slice(0, MAX_PHRASE_RUNES);
    tokens.push(han.join(" "));
    han = [];
  };
  for (const ch of q) {
    if (isHan(ch)) {
      flushASCII();
      han.push(ch);
    } else if (/[A-Za-z0-9]/.test(ch)) {
      flushHan();
      ascii += ch.toLowerCase();
    } else {
      flushHan();
      flushASCII();
    }
  }
  flushHan();
  flushASCII();
  return tokens;
}

function asciiWord(token: string): boolean {
  if (!token) return false;
  for (const ch of token) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 127 || !/[A-Za-z0-9]/.test(ch)) return false;
  }
  return true;
}

