import { create } from "zustand";

export const useChatChrome = create<{
  threadTitle: string | null;
  setThreadTitle: (title: string | null) => void;
}>((set) => ({
  threadTitle: null,
  setThreadTitle: (threadTitle) => set({ threadTitle }),
}));
