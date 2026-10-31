export type FeedConfig = {
  weights: {
    distance: number;
    interest: number;
    soonness: number;
    followed_org: number;
    popularity: number;
    age_fit: number;
  };
  distance: { full_km: number; zero_km: number };
  soonness: { full_within_days: number; zero_after_days: number };
  long_span: { threshold_days: number; multiplier: number };
  source_weights: Record<string, number>;
  default_source_weight: number;
  interest: { join: number; save: number; like: number; view: number; half_life_days: number };
  popularity_full_at: number;
  age_gap_zero_years: number;
  default_location: { latitude: number; longitude: number };
  variety_max_same_organizer: number;
  variety_max_same_category: number;
};

export const feedConfig: FeedConfig = {
  weights: {
    distance: 25,
    interest: 25,
    soonness: 15,
    followed_org: 15,
    popularity: 10,
    age_fit: 10,
  },
  distance: { full_km: 3, zero_km: 15 },
  soonness: { full_within_days: 3, zero_after_days: 21 },
  long_span: { threshold_days: 14, multiplier: 0.35 },
  source_weights: { native: 1 },
  default_source_weight: 0.85,
  interest: { join: 1, save: 0.7, like: 0.5, view: 0.15, half_life_days: 30 },
  popularity_full_at: 20,
  age_gap_zero_years: 10,
  default_location: { latitude: 22.3193, longitude: 114.1694 },
  variety_max_same_organizer: 2,
  variety_max_same_category: 2,
};

export function sourceWeight(cfg: FeedConfig, source: string): number {
  let key = source.trim();
  if (!key) key = "native";
  return cfg.source_weights[key] ?? cfg.default_source_weight;
}

export function kindWeight(cfg: FeedConfig, kind: string): number {
  if (kind === "join") return cfg.interest.join;
  if (kind === "save") return cfg.interest.save;
  if (kind === "like") return cfg.interest.like;
  if (kind === "view") return cfg.interest.view;
  return 0;
}
