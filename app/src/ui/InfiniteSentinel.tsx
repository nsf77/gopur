import { onCleanup, onSettled } from "solid-js";

export function InfiniteSentinel(props: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  let el: HTMLDivElement | undefined;
  onSettled(() => {
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && props.hasNextPage && !props.isFetchingNextPage) {
        props.onLoadMore();
      }
    });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });
  return <div ref={el} class="h-px" aria-hidden="true" />;
}
