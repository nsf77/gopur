import type { Event, User } from "./schemas";

export function canCreateEvents(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.is_verified || user.role === "admin";
}

export function isEventHost(userId: string | null | undefined, event: Event | null | undefined): boolean {
  if (!userId || !event) return false;
  return userId === event.host_user_id || Boolean(event.organizer?.id && userId === event.organizer.id);
}

export function canEditEvent(user: User | null | undefined, event: Event | null | undefined): boolean {
  if (!user || !event) return false;
  if (event.imported) return false;
  return user.role === "admin" || isEventHost(user.id, event);
}
