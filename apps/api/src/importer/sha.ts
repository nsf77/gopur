function toArrayBuffer(data: string | Uint8Array): ArrayBuffer {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function sha256(data: string | Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(data)));
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const digest = await sha256(data);
  let out = "";
  for (const b of digest) out += b.toString(16).padStart(2, "0");
  return out;
}
