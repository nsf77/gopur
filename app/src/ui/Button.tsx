import type { ParentProps } from "solid-js";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 font-bold rounded-pill px-4 text-sm transition-transform duration-150 ease-standard active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast",
  secondary: "border border-divider bg-transparent text-text",
  ghost: "bg-transparent text-text",
};

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
  const cls = () => `${BASE} ${VARIANT[props.variant ?? "primary"]}${props.class ? ` ${props.class}` : ""}`;
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
