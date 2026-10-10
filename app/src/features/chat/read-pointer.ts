export function createReadPointer(
  post: (id: string) => Promise<unknown>,
  ms = 1000,
): { seen(messageId: string): void; dispose(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastPosted: string | undefined;

  const dispose = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    seen(messageId: string) {
      if (messageId === lastPosted) return;
      dispose();
      timer = setTimeout(() => {
        timer = undefined;
        lastPosted = messageId;
        void post(messageId);
      }, ms);
    },
    dispose,
  };
}

export function tabIsFocused(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible" && document.hasFocus();
}
