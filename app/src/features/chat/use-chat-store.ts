import { useSyncExternalStore } from "react";
import { chatStoreGeneration, subscribeChatStore } from "./store";

export function useChatStoreGeneration(): number {
  return useSyncExternalStore(subscribeChatStore, chatStoreGeneration, chatStoreGeneration);
}
