import type { ReactNode } from "react";
import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { LayerDialog } from "@cloudflare/kumo/components/layer-dialog";
import { m } from "../paraglide/messages.js";

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
      <Dialog className="p-6">
        <Dialog.Title className="mb-3 text-lg font-bold">{props.title}</Dialog.Title>
        <Dialog.Description className="m-0 text-sm text-kumo-subtle">{props.children}</Dialog.Description>
        <div className="mt-4 flex gap-2">
          <Dialog.Close
            render={(closeProps) => (
              <Button variant="secondary" className="flex-1" {...closeProps}>
                {props.cancelLabel}
              </Button>
            )}
          />
          <Button variant="primary" className="flex-1" onClick={props.onConfirm}>
            {props.confirmLabel}
          </Button>
        </div>
      </Dialog>
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
    <LayerDialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <LayerDialog.Content closeLabel={m.common_done()}>
        <LayerDialog.Title>{props.title}</LayerDialog.Title>
        <LayerDialog.Body>{props.children}</LayerDialog.Body>
        <LayerDialog.Actions dismissLabel={m.common_back()}>
          <LayerDialog.Actions.Primary onClick={() => props.onOpenChange(false)}>
            {m.common_done()}
          </LayerDialog.Actions.Primary>
        </LayerDialog.Actions>
      </LayerDialog.Content>
    </LayerDialog.Root>
  );
}
