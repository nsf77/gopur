import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/solid-query";
import type { Event } from "api";
import { A, O, pipe } from "./belt";
import {
  fetchEvent,
  fetchFeed,
  fetchLikers,
  fetchMe,
  fetchOrganizer,
  fetchOrganizers,
  fetchUser,
  followUser,
  likeEvent,
  patchMe,
  saveEvent,
  searchEvents,
  shareEvent,
  unfollowUser,
  unlikeEvent,
  unsaveEvent,
  type ApiError,
} from "./api";
import { applyLikeToggle, applySaveToggle, applyShareBump, patchCachedEvents } from "./engagement";
import { isSignedIn } from "./session";
import { queryClient } from "../query";

export function useFeed() {
  return useInfiniteQuery(() => ({
    queryKey: ["feed"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Awaited<ReturnType<typeof fetchFeed>>) => last.next_cursor,
  }));
}

export function feedEventsFromPages(
  pages: { events: Event[] }[] | undefined,
): Event[] {
  return pipe(
    O.fromNullable(pages),
    O.map((list) => [...A.flat(A.map(list, (page) => page.events))]),
    O.getWithDefault([] as Event[]),
  );
}

export function useEvent(id: () => string) {
  return useQuery(() => ({
    queryKey: ["event", id()],
    enabled: Boolean(id()),
    queryFn: () => fetchEvent(id()),
  }));
}

export function useSearchEvents(params: () => Record<string, string | undefined>, enabled: () => boolean) {
  return useInfiniteQuery(() => ({
    queryKey: ["search-events", params()],
    enabled: enabled(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      searchEvents({ ...params(), cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Awaited<ReturnType<typeof searchEvents>>) => last.next_cursor,
  }));
}

export function useOrganizers(q: () => string) {
  return useQuery(() => ({
    queryKey: ["organizers", q()],
    queryFn: () => fetchOrganizers(q() || undefined),
  }));
}

export function useOrganizer(key: () => string) {
  return useQuery(() => ({
    queryKey: ["organizer", key()],
    enabled: Boolean(key()),
    queryFn: () => fetchOrganizer(key()),
  }));
}

export function useLikers(id: () => string) {
  return useInfiniteQuery(() => ({
    queryKey: ["likers", id()],
    enabled: Boolean(id()),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => fetchLikers(id(), pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Awaited<ReturnType<typeof fetchLikers>>) => last.next_cursor,
  }));
}

export function useMe() {
  return useQuery(() => ({
    queryKey: ["me"],
    enabled: isSignedIn(),
    queryFn: () => fetchMe(),
  }));
}

export function useUser(id: () => string) {
  return useQuery(() => ({
    queryKey: ["user", id()],
    enabled: Boolean(id()) && isSignedIn(),
    queryFn: () => fetchUser(id()),
  }));
}

export function useToggleLiked(event: () => Event) {
  return useMutation(() => ({
    mutationFn: (liked: boolean) => (liked ? likeEvent(event().id) : unlikeEvent(event().id)),
    onMutate: (liked: boolean) => {
      patchCachedEvents(queryClient, event().id, (row) => applyLikeToggle(row, liked));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["event", event().id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  }));
}

export function useToggleSaved(event: () => Event) {
  return useMutation(() => ({
    mutationFn: (saved: boolean) => (saved ? saveEvent(event().id) : unsaveEvent(event().id)),
    onMutate: (saved: boolean) => {
      patchCachedEvents(queryClient, event().id, (row) => applySaveToggle(row, saved));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["event", event().id] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  }));
}

export function useRecordShare(event: () => Event) {
  return useMutation(() => ({
    mutationFn: () => shareEvent(event().id),
    onSuccess: () => {
      patchCachedEvents(queryClient, event().id, applyShareBump);
    },
  }));
}

export function useFollow(id: () => string) {
  return useMutation(() => ({
    mutationFn: (next: boolean) => (next ? followUser(id()) : unfollowUser(id())),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", id()] });
    },
  }));
}

export function usePatchMe() {
  return useMutation(() => ({
    mutationFn: patchMe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  }));
}

export function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as ApiError).status === 404);
}
