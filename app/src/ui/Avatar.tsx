import { Show } from "solid-js";
import { organizerColorFromName, organizerInitial } from "../lib/avatar";

const SIZE = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
} as const;

export function Avatar(props: { name: string; src?: string | null; size?: keyof typeof SIZE; class?: string }) {
  const size = () => props.size ?? "md";
  return (
    <span class={`inline-flex shrink-0 overflow-hidden rounded-full ${SIZE[size()]}${props.class ? ` ${props.class}` : ""}`}>
      <Show
        when={props.src}
        fallback={
          <span
            class="flex size-full items-center justify-center font-bold text-white"
            style={{ "background-color": organizerColorFromName(props.name) }}
            aria-hidden="true"
          >
            {organizerInitial(props.name)}
          </span>
        }
      >
        {(src) => <img src={src()} alt="" class="size-full object-cover" loading="lazy" decoding="async" />}
      </Show>
    </span>
  );
}
