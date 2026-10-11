import { useEffect, useRef } from "react";

export function InfiniteSentinel(props: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && props.hasNextPage && !props.isFetchingNextPage) {
        props.onLoadMore();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [props.hasNextPage, props.isFetchingNextPage, props.onLoadMore]);

  return <div ref={el} className="h-px" aria-hidden="true" />;
}
