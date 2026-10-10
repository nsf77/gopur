export * from "solid-js-runtime";
export {
  createRenderEffect as createComputed,
  merge as mergeProps,
  onSettled as onMount,
} from "solid-js-runtime";
import { For, omit } from "solid-js-runtime";
import type { Element as SolidElement } from "solid-js-runtime";

export function splitProps<T extends Record<string, unknown>>(
  props: T,
  ...keyGroups: readonly (readonly string[])[]
): Record<string, unknown>[] {
  const used = new Set<string>();
  const parts: Record<string, unknown>[] = [];
  for (const keys of keyGroups) {
    const picked: Record<string, unknown> = {};
    for (const key of keys) {
      picked[key] = props[key];
      used.add(key);
    }
    parts.push(picked);
  }
  parts.push(omit(props, [...used] as never) as Record<string, unknown>);
  return parts;
}

export function on<T>(
  deps: (() => T) | readonly (() => unknown)[],
  fn: (value: T) => void,
): () => void {
  return () => {
    const value = typeof deps === "function" ? deps() : (deps.map((d) => d()) as T);
    fn(value);
  };
}

export function Index<T extends readonly unknown[]>(props: {
  each: T | undefined | null | false;
  fallback?: SolidElement;
  children: (item: () => T[number], index: number) => SolidElement;
}): SolidElement {
  return For({
    each: props.each,
    fallback: props.fallback,
    keyed: false,
    children: (item, index) => props.children(item, index),
  });
}
