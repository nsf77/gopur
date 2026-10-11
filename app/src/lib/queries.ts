import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { A, O, pipe } from "./belt";
import {
  fetchEvent,
  fetchFeed,
  fetchOrganizers,
  likeEvent,
  saveEvent,
  searchEvents,
  shareEvent,
  unlikeEvent,
  unsaveEvent,
  type ApiError,
} from "./api";
import { applyLikeToggle, applySaveToggle, applyShareBump, patchCachedEvents } from "./engagement";
import { queryClient } from "./query";
import type { Event } from "./schemas";

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
