export class FetchError extends Error {
  constructor(
    public url: string,
    public status: string,
  ) {
    super(`GET ${url}: ${status}`);
  }
}

export type Fetcher = {
  get(url: string, limit: number, signal?: AbortSignal): Promise<Uint8Array>;
};

async function gunzipIfNeeded(buf: Uint8Array): Promise<Uint8Array> {
  if (buf.length < 2 || buf[0] !== 0x1f || buf[1] !== 0x8b) return buf;
  const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function httpFetcher(): Fetcher {
  return {
    async get(url, limit, signal) {
      const resp = await fetch(url, {
        headers: { "user-agent": "gopur-importer", accept: "*/*" },
        signal,
      });
      if (!resp.ok) throw new FetchError(url, `${resp.status} ${resp.statusText}`);
      let buf: Uint8Array = new Uint8Array(await resp.arrayBuffer());
      buf = await gunzipIfNeeded(buf);
      return buf.length > limit ? buf.subarray(0, limit) : buf;
    },
  };
}
