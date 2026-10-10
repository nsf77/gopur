import { Show } from "solid-js";
import { organizerColorFromName, organizerInitial } from "../lib/avatar";
import { avatar } from "./styles";

export function Avatar(props: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; class?: string }) {
  return (
    <span class={avatar({ size: props.size, class: props.class })}>
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
