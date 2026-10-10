import type { ParentProps } from "solid-js";
import { button, type ButtonVariants } from "./styles";

export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;

export function Button(
  props: ParentProps<{
    variant?: ButtonVariant;
    class?: string;
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: (event: MouseEvent) => void;
    href?: string;
  }>,
) {
  const cls = () => button({ variant: props.variant, class: props.class });
  if (props.href) {
    return (
      <a href={props.href} class={cls()}>
        {props.children}
      </a>
    );
  }
  return (
    <button type={props.type ?? "button"} class={cls()} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
