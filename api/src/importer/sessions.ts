import { sha256 } from "./sha";
import { hktYMD, onDay as onDayTime, rfc3339Utc } from "./time";
import type { ImportEvent, Session } from "./types";

export { onDayTime as onDay };

export function foldLabel(s: string): string {
  return s.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

export async function groupExternalID(parts: string[]): Promise<string> {
  const sum = await sha256(parts.join("\n"));
  let hex = "";
  for (const b of sum.subarray(0, 8)) hex += b.toString(16).padStart(2, "0");
  return "grp:" + hex;
}

export function normalizeSessions(
  sessions: Session[],
  start: Date,
  end: Date,
): { sessions: Session[]; start: Date; end: Date } {
  let list: Session[] =
    sessions.length === 0 && start.getTime() !== 0 && end.getTime() !== 0 && end >= start
      ? [{ start, end }]
      : sessions.slice();
  list.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());
  const out: Session[] = [];
  for (const session of list) {
    if (session.start.getTime() === 0 || session.end.getTime() === 0 || session.end < session.start) {
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.start.getTime() === session.start.getTime()) {
      if (session.end > last.end) last.end = session.end;
      continue;
    }
    out.push({ start: session.start, end: session.end });
  }
  if (out.length === 0) {
    return { sessions: [], start: new Date(0), end: new Date(0) };
  }
  return { sessions: out, start: out[0]!.start, end: out[out.length - 1]!.end };
}

export function upcoming(end: Date, now: Date): boolean {
  return end.getTime() > now.getTime();
}

export function withinHorizon(start: Date, now: Date): boolean {
  return start.getTime() <= now.getTime() + (365 + 183) * 86400_000;
}

export function filterSessions(sessions: Session[], now: Date): Session[] {
  return sessions.filter((s) => upcoming(s.end, now) && withinHorizon(s.start, now));
}

export function storedSessions(event: ImportEvent): Session[] {
  return normalizeSessions(event.sessions, event.startAt, event.endAt).sessions;
}

export function sessionColumns(event: ImportEvent): { count: number; nextStart: string; nextEnd: string } {
  const sessions = storedSessions(event);
  if (sessions.length === 0) {
    return { count: 1, nextStart: rfc3339Utc(event.startAt), nextEnd: rfc3339Utc(event.endAt) };
  }
  return {
    count: sessions.length,
    nextStart: rfc3339Utc(sessions[0]!.start),
    nextEnd: rfc3339Utc(sessions[0]!.end),
  };
}

export function hktYmdKey(d: Date): string {
  const { y, m, day } = hktYMD(d);
  return `${y}${String(m).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}
