import * as v from "valibot";

export const Healthz = v.object({
  ok: v.literal(true),
});

export type Healthz = v.InferOutput<typeof Healthz>;

export function parseHealthz(data: unknown): Healthz {
  return v.parse(Healthz, data);
}
