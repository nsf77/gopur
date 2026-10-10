export * from "solid-js-runtime";
export { merge as mergeProps, onSettled as onMount } from "solid-js-runtime";
import {
  For,
  omit,
  createContext as createContext2,
  createEffect as createEffect2,
  createRenderEffect as createRenderEffect2,
  useContext as useContext2,
} from "solid-js-runtime";
import type { Element as SolidElement } from "solid-js-runtime";

/** Solid 2 effect bundles expose `.effect`; a lone callback is the Solid 1 form. */
function isSolid2EffectFn(value: unknown): boolean {
  return (
    typeof value === "function" ||
    (typeof value === "object" && value !== null && "effect" in value)
  );
}

/**
 * Solid 2's createContext() *is* the provider function. Solid 1 returned
 * `{ Provider, id }`. Ark UI still does `createComponent(Context.Provider, …)`,
 * which is `undefined` on Solid 2 and throws `e is not a function`.
 */
export function createContext(defaultValue?: unknown, options?: { name?: string }) {
  const context = createContext2(defaultValue as never, options as never) as ((props: {
    value: unknown;
    children?: unknown;
  }) => unknown) & { Provider?: unknown };
  context.Provider ??= context;
  return context;
}

/** Solid 1 returned `undefined` when no Provider was present. Solid 2 throws. */
export function useContext<T>(context: { id: symbol; defaultValue?: T }): T | undefined {
  try {
    return useContext2(context as never) as T;
  } catch (error) {
    // ContextNotFoundError / NoOwnerError are empty-message Errors in prod.
    if (error instanceof Error && error.message === "") return undefined;
    throw error;
  }
}

/**
 * Solid 2's production `createEffect(compute, effectFn)` reads `effectFn.effect`.
 * `@ark-ui/solid` / `@zag-js/solid` still call the Solid 1 single-callback form,
 * which throws `Cannot read properties of undefined (reading 'effect')`.
 */
export function createEffect(
  compute: (...args: never[]) => unknown,
  effectFn?: unknown,
  options?: object,
): void {
  if (isSolid2EffectFn(effectFn)) {
    createEffect2(compute as never, effectFn as never, options);
    return;
  }
  createEffect2(
    ((prev: unknown) => (compute as (value: unknown) => unknown)(prev)) as never,
    (() => {}) as never,
    options,
  );
}

export function createRenderEffect(
  compute: (...args: never[]) => unknown,
  effectFn?: unknown,
  options?: object,
): void {
  if (isSolid2EffectFn(effectFn)) {
    createRenderEffect2(compute as never, effectFn as never, options);
    return;
  }
  createRenderEffect2(
    ((prev: unknown) => (compute as (value: unknown) => unknown)(prev)) as never,
    (() => {}) as never,
    options,
  );
}

export function createComputed(
  fn: (...args: never[]) => unknown,
  value?: unknown,
  options?: object,
): void {
  createRenderEffect2(
    ((prev: unknown) => (fn as (next: unknown) => unknown)(prev === undefined ? value : prev)) as never,
    (() => {}) as never,
    options,
  );
}

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
