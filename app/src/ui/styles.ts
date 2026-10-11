import { cva, type VariantProps } from "class-variance-authority";

export const button = cva(
  "inline-flex items-center justify-center gap-2 min-h-11 font-bold rounded-pill px-4 text-sm transition-transform duration-150 ease-standard active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-contrast",
        secondary: "border border-divider bg-transparent text-text",
        ghost: "bg-transparent text-text",
      },
      width: {
        auto: "",
        grow: "flex-1",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      width: "auto",
    },
  },
);

export type ButtonVariants = VariantProps<typeof button>;

export const dialogOverlay = cva("fixed inset-0 z-50 bg-black/50");

export const dialogContent = cva(
  "glass-surface fixed z-50 mx-auto w-full max-w-md p-4",
  {
    variants: {
      placement: {
        dialog:
          "inset-x-4 bottom-4 rounded-lg md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
        sheet:
          "inset-x-0 bottom-0 rounded-t-lg pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg",
      },
    },
    defaultVariants: {
      placement: "dialog",
    },
  },
);

export const dialogTitle = cva("mb-3 text-lg font-bold");
export const dialogDescription = cva("m-0 text-sm text-text-muted");
export const dialogActions = cva("mt-4 flex gap-2");
export const dialogHandle = cva("mx-auto mb-3 h-1 w-9 rounded-pill bg-divider md:hidden");

export const tabsList = cva("flex gap-1 px-4");
export const tabsTrigger = cva(
  "min-h-11 rounded-pill px-3 text-sm font-semibold text-text-muted data-selected:bg-accent-subtle data-selected:text-accent",
);
export const tabsContent = cva("pt-2");

export const switchRoot = cva("flex min-h-11 items-center gap-3");
export const switchControl = cva(
  "relative inline-flex h-7 w-11 items-center rounded-pill bg-surface-pressed data-checked:bg-accent",
);
export const switchThumb = cva(
  "size-5 translate-x-1 rounded-full bg-white transition-transform data-checked:translate-x-5",
);
export const switchLabel = cva("text-sm font-medium");

export const otpRoot = cva("grid gap-1");
export const otpLabel = cva("text-sm font-medium");
export const otpSlots = cva("flex gap-2");
export const otpInput = cva(
  "flex size-11 items-center justify-center rounded-md border border-divider bg-surface text-center text-lg font-semibold tabular-nums outline-none data-focused:border-accent",
);

export const statusMessage = cva("grid gap-2 p-4 text-sm", {
  variants: {
    kind: {
      empty: "text-text-muted",
      error: "text-text-muted",
    },
  },
  defaultVariants: {
    kind: "empty",
  },
});
