import type { LocaleMap } from "../i18n";

export const TYPE_VOLUNTEER = "volunteer";
export const TYPE_COMMUNITY = "community";
export const TYPE_CLASS = "class";
export const TYPE_OFFICIAL = "official";

export type Session = { start: Date; end: Date };

export type PriceTier = { cents: number; label?: string | null };

export type SourceMeta = {
  id: string;
  username: string;
  displayName: string;
  attribution: string;
  datasetUrl: string;
  listingUrl: string;
};

export type ImportEvent = {
  source: string;
  externalId: string;
  title: LocaleMap;
  description: LocaleMap;
  location: LocaleMap;
  startAt: Date;
  endAt: Date;
  type: string;
  priceCents: number | null;
  priceMaxCents: number | null;
  priceTiers: PriceTier[];
  sourceUrl: string;
  sourceUrlGeneric: boolean;
  latitude: number | null;
  longitude: number | null;
  district: string;
  districtI18n: LocaleMap;
  attribution: string;
  attributionUrl: string;
  organizer: LocaleMap;
  dateTbc: boolean;
  sourceUrlOverride: string;
  sessions: Session[];
  hash: string;
  dedupeTitleTc: string;
  dedupeVenueTc: string;
  dedupeVenueEn: string;
  ownerUsername: string;
  foldedIds: string[];
  replaces: string[];
};

export function emptyEvent(): ImportEvent {
  return {
    source: "",
    externalId: "",
    title: {},
    description: {},
    location: {},
    startAt: new Date(0),
    endAt: new Date(0),
    type: "",
    priceCents: null,
    priceMaxCents: null,
    priceTiers: [],
    sourceUrl: "",
    sourceUrlGeneric: false,
    latitude: null,
    longitude: null,
    district: "",
    districtI18n: {},
    attribution: "",
    attributionUrl: "",
    organizer: {},
    dateTbc: false,
    sourceUrlOverride: "",
    sessions: [],
    hash: "",
    dedupeTitleTc: "",
    dedupeVenueTc: "",
    dedupeVenueEn: "",
    ownerUsername: "",
    foldedIds: [],
    replaces: [],
  };
}

export type Batch = { events: ImportEvent[]; errors: number };

export type Counts = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  hidden: number;
  errors: number;
  deduped?: number;
  duration_ms: number;
  error?: string;
};

export type Report = { sources: Record<string, Counts> };

export type RunState = {
  id?: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  sources: Record<string, Counts>;
};
