import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  createEvent,
  fetchEvent,
  fetchFeed,
  fetchLikedEvents,
  fetchMe,
  fetchMyEvents,
  fetchNotifications,
  fetchOrganizers,
  fetchSavedEvents,
  fetchUnreadCount,
  likeEvent,
  markAllNotificationsRead,
  markNotificationRead,
  patchMe,
  saveEvent,
  searchEvents,
  shareEvent,
  unlikeEvent,
  unsaveEvent,
  updateEvent,
  type ApiError,
} from "./api";
import { A, O, pipe } from "@gopur/shared";
import type { EventWriteBody } from "@gopur/shared";
import { applyLikeToggle, applySaveToggle, applyShareBump, patchCachedEvents } from "./engagement";
import { queryClient } from "./query";
import type { Event, Notification, User } from "@gopur/shared";
import { useSessionStore } from "../stores/session";

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function feedEventsFromPages(pages: { events: Event[] }[] | undefined): Event[] {
  return pipe(
    O.fromNullable(pages),
    O.map((list) => [...A.flat(A.map(list, (page) => page.events))]),
    O.getWithDefault([] as Event[]),
  );
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    enabled: Boolean(id),
    queryFn: () => fetchEvent(id),
  });
}

export function useSearchEvents(params: Record<string, string | undefined>, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["search-events", params],
    enabled,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      searchEvents({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function useOrganizers(q: string, enabled = true) {
  return useQuery({
    queryKey: ["organizers", q],
    enabled,
    queryFn: () => fetchOrganizers(q || undefined),
  });
}

export function useToggleLiked(event: Event) {
  return useMutation({
    mutationFn: (liked: boolean) => (liked ? likeEvent(event.id) : unlikeEvent(event.id)),
    onMutate: (liked: boolean) => {
      patchCachedEvents(queryClient, event.id, (row) => applyLikeToggle(row, liked));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["search-events"] });
      void queryClient.invalidateQueries({ queryKey: ["me-likes"] });
    },
  });
}

export function useToggleSaved(event: Event) {
  return useMutation({
    mutationFn: (saved: boolean) => (saved ? saveEvent(event.id) : unsaveEvent(event.id)),
    onMutate: (saved: boolean) => {
      patchCachedEvents(queryClient, event.id, (row) => applySaveToggle(row, saved));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["search-events"] });
      void queryClient.invalidateQueries({ queryKey: ["me-saved"] });
    },
  });
}

export function useRecordShare(event: Event) {
  return useMutation({
    mutationFn: () => shareEvent(event.id),
    onSuccess: () => {
      patchCachedEvents(queryClient, event.id, applyShareBump);
    },
  });
}

export function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as ApiError).status === 404);
}

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    enabled,
    queryFn: fetchMe,
  });
}

export function useMyEvents(when: "upcoming" | "past", enabled: boolean) {
  return useQuery({
    queryKey: ["me-events", when],
    enabled,
    queryFn: () => fetchMyEvents(when),
  });
}

export function useSavedEvents(enabled: boolean) {
  return useQuery({
    queryKey: ["me-saved"],
    enabled,
    queryFn: fetchSavedEvents,
  });
}

export function useLikedEvents(enabled: boolean) {
  return useQuery({
    queryKey: ["me-likes"],
    enabled,
    queryFn: fetchLikedEvents,
  });
}

export function useNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    enabled,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function notificationsFromPages(pages: { notifications: Notification[] }[] | undefined): Notification[] {
  return pipe(
    O.fromNullable(pages),
    O.map((list) => {
      const seen = new Set<string>();
      const items: Notification[] = [];
      for (const page of list) {
        for (const item of page.notifications) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          items.push(item);
        }
      }
      return items;
    }),
    O.getWithDefault([] as Notification[]),
  );
}

export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: ["unread-count"],
    enabled,
    queryFn: fetchUnreadCount,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: markNotificationRead,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: (body: EventWriteBody) => createEvent(body),
    onSuccess: (event) => {
      queryClient.setQueryData(["event", event.id], event);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["me-events"] });
    },
  });
}

export function useUpdateEvent(id: string) {
  return useMutation({
    mutationFn: (body: EventWriteBody) => updateEvent(id, body),
    onSuccess: (event) => {
      queryClient.setQueryData(["event", id], event);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["me-events"] });
    },
  });
}

export function usePatchMe() {
  const updateUser = useSessionStore((s) => s.updateUser);
  return useMutation({
    mutationFn: (body: Record<string, string | boolean>) => patchMe(body),
    onSuccess: (user: User) => {
      updateUser(user);
      queryClient.setQueryData(["me"], user);
    },
  });
}
