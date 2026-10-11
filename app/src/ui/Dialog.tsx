import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { button, dialogActions, dialogContent, dialogDescription, dialogOverlay, dialogTitle } from "./styles";

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
