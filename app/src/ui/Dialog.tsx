import { Dialog } from "@kobalte/core/dialog";
import type { JSX } from "@solidjs/web";

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  children: JSX.Element;
  confirmLabel: string;
  cancelLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content class="glass-surface fixed inset-x-4 bottom-4 z-50 mx-auto w-full max-w-md rounded-lg p-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
          <Dialog.Title class="mb-3 text-lg font-bold">{props.title}</Dialog.Title>
          <Dialog.Description class="m-0 text-sm text-text-muted">{props.children}</Dialog.Description>
          <div class="mt-4 flex gap-2">
            <Dialog.CloseButton
              type="button"
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-pill border border-divider text-sm font-bold"
            >
              {props.cancelLabel}
            </Dialog.CloseButton>
            <button
              type="button"
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-pill bg-accent text-sm font-bold text-accent-contrast"
              onClick={props.onConfirm}
            >
              {props.confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

export function Sheet(props: {
  open: boolean;
  title: string;
  children: JSX.Element;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content class="glass-surface fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-lg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg">
          <div class="mx-auto mb-3 h-1 w-9 rounded-pill bg-divider md:hidden" aria-hidden="true" />
          <Dialog.Title class="mb-3 text-lg font-bold">{props.title}</Dialog.Title>
          {props.children}
          <Dialog.CloseButton
            type="button"
            class="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-accent text-sm font-bold text-accent-contrast"
          >
            Done
          </Dialog.CloseButton>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
