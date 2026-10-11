import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { m } from "../paraglide/messages.js";
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
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialogOverlay()} />
        <Dialog.Popup className={dialogContent({ placement: "dialog" })}>
          <Dialog.Title className={dialogTitle()}>{props.title}</Dialog.Title>
          <Dialog.Description className={dialogDescription()}>{props.children}</Dialog.Description>
          <div className={dialogActions()}>
            <Dialog.Close className={button({ variant: "secondary", width: "grow" })}>
              {props.cancelLabel}
            </Dialog.Close>
            <button type="button" className={button({ variant: "primary", width: "grow" })} onClick={props.onConfirm}>
              {props.confirmLabel}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Sheet(props: {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialogOverlay()} />
        <Dialog.Popup className={dialogContent({ placement: "sheet" })}>
          <div className={dialogHandle()} aria-hidden="true" />
          <Dialog.Title className={dialogTitle()}>{props.title}</Dialog.Title>
          {props.children}
          <Dialog.Close className={button({ variant: "primary", width: "full", class: "mt-4" })}>
            {m.common_done()}
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
