export type XmlElem = { attrs: Record<string, string>; inner: string };

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function xmlAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([:\w]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out[m[1]!] = m[2]!;
  return out;
}

export function xmlBlocks(xml: string, tag: string): XmlElem[] {
  const out: XmlElem[] = [];
  const open = new RegExp(`<${tag}\\b([^>]*)>`, "g");
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const rawAttrs = m[1] ?? "";
    if (/\/\s*$/.test(rawAttrs) || m[0].endsWith("/>")) {
      out.push({ attrs: xmlAttrs(rawAttrs.replace(/\/\s*$/, "")), inner: "" });
      continue;
    }
    const attrs = xmlAttrs(rawAttrs);
    const start = m.index + m[0].length;
    const close = `</${tag}>`;
    const end = xml.indexOf(close, start);
    if (end < 0) continue;
    out.push({ attrs, inner: xml.slice(start, end) });
    open.lastIndex = end + close.length;
  }
  return out;
}

export function xmlChild(inner: string, tag: string): string {
  const blocks = xmlBlocks(inner, tag);
  if (blocks.length === 0) return "";
  return decodeEntities(blocks[0]!.inner).trim();
}

export function xmlChildren(inner: string, tag: string): string[] {
  return xmlBlocks(inner, tag).map((b) => decodeEntities(b.inner).trim());
}
