import type { Tick } from "./types";

const RANK: Record<Tick, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function applyTick(current: Tick, incoming: Tick): Tick {
  return RANK[incoming] > RANK[current] ? incoming : current;
}

export function tickFromReceiptStatus(status: "delivered" | "read"): Tick {
  return status;
}
