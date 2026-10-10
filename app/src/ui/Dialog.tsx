import { Dialog } from "@kobalte/core/dialog";
import type { JSX } from "@solidjs/web";
import {
  button,
  dialogActions,
  dialogContent,
  dialogDescription,
  dialogHandle,
  dialogOverlay,
  dialogTitle,
} from "./styles";

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
        <Dialog.Overlay class={dialogOverlay()} />
        <Dialog.Content class={dialogContent({ placement: "dialog" })}>
          <Dialog.Title class={dialogTitle()}>{props.title}</Dialog.Title>
          <Dialog.Description class={dialogDescription()}>{props.children}</Dialog.Description>
          <div class={dialogActions()}>
            <Dialog.CloseButton type="button" class={button({ variant: "secondary", width: "grow" })}>
              {props.cancelLabel}
            </Dialog.CloseButton>
            <button type="button" class={button({ variant: "primary", width: "grow" })} onClick={props.onConfirm}>
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
        <Dialog.Overlay class={dialogOverlay()} />
        <Dialog.Content class={dialogContent({ placement: "sheet" })}>
          <div class={dialogHandle()} aria-hidden="true" />
          <Dialog.Title class={dialogTitle()}>{props.title}</Dialog.Title>
          {props.children}
          <Dialog.CloseButton type="button" class={button({ variant: "primary", width: "full", class: "mt-4" })}>
            Done
          </Dialog.CloseButton>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
