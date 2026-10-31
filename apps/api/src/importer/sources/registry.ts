import type { Fetcher } from "../fetch";
import type { Batch } from "../types";
import type { SourceMeta } from "../event";
import * as lcsd from "./lcsd";
import * as urbtix from "./urbtix";
import * as smartplay from "./smartplay";
import * as smartsilver from "./smartsilver";
import * as mmark from "./mmark";
import * as wwf from "./wwf";
import { resetGlobal } from "./lcsdvenues";

export type Adapter = {
  meta: () => SourceMeta;
  fetch: (fetcher: Fetcher) => Promise<Batch>;
};

export function adapters(now: () => Date): Adapter[] {
  return [
    { meta: lcsd.meta, fetch: (f) => lcsd.fetchLcsd({ now }, f) },
    { meta: urbtix.meta, fetch: (f) => urbtix.fetchUrbtix(now, f) },
    { meta: smartplay.meta, fetch: (f) => smartplay.fetchSmartplay(now, f) },
    { meta: smartsilver.meta, fetch: (f) => smartsilver.fetchSmartsilver(now, f) },
    { meta: mmark.meta, fetch: (f) => mmark.fetchMmark(now, f) },
    { meta: wwf.meta, fetch: (f) => wwf.fetchWwf(now, f) },
  ];
}

export { resetGlobal as resetLcsdVenues };
