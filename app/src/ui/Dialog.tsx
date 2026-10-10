import { Dialog as ArkDialog } from "@ark-ui/solid/dialog";
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
    <ArkDialog.Root open={props.open} onOpenChange={(d) => props.onOpenChange(d.open)}>
      <ArkDialog.Backdrop
        render={(api) => <div {...api({ class: "fixed inset-0 z-50 bg-black/50" })} />}
      />
      <ArkDialog.Positioner
        render={(api) => (
          <div {...api({ class: "fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center" })}>
            <ArkDialog.Content
              render={(content) => (
                <div {...content({ class: "glass-surface w-full max-w-md rounded-lg p-4" })}>
                  <ArkDialog.Title render={(title) => <h2 {...title({ class: "mb-3 text-lg font-bold" })}>{props.title}</h2>} />
                  <div class="text-sm text-text-muted">{props.children}</div>
                  <div class="mt-4 flex gap-2">
                    <ArkDialog.CloseTrigger
                      render={(close) => (
                        <button
                          {...close({
                            type: "button",
                            class:
                              "inline-flex min-h-11 flex-1 items-center justify-center rounded-pill border border-divider text-sm font-bold",
                          })}
                        >
                          {props.cancelLabel}
                        </button>
                      )}
                    />
                    <button
                      type="button"
                      class="inline-flex min-h-11 flex-1 items-center justify-center rounded-pill bg-accent text-sm font-bold text-accent-contrast"
                      onClick={props.onConfirm}
                    >
                      {props.confirmLabel}
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      />
    </ArkDialog.Root>
  );
}

export function Sheet(props: {
  open: boolean;
  title: string;
  children: JSX.Element;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ArkDialog.Root open={props.open} onOpenChange={(d) => props.onOpenChange(d.open)}>
      <ArkDialog.Backdrop
        render={(api) => <div {...api({ class: "fixed inset-0 z-50 bg-black/50" })} />}
      />
      <ArkDialog.Positioner
        render={(api) => (
          <div {...api({ class: "fixed inset-0 z-50 flex items-end justify-center md:items-center" })}>
            <ArkDialog.Content
              render={(content) => (
                <div
                  {...content({
                    class:
                      "glass-surface w-full max-w-md rounded-t-lg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:rounded-lg",
                  })}
                >
                  <div class="mx-auto mb-3 h-1 w-9 rounded-pill bg-divider md:hidden" aria-hidden="true" />
                  <ArkDialog.Title render={(title) => <h2 {...title({ class: "mb-3 text-lg font-bold" })}>{props.title}</h2>} />
                  {props.children}
                  <ArkDialog.CloseTrigger
                    render={(close) => (
                      <button
                        {...close({
                          type: "button",
                          class:
                            "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-accent text-sm font-bold text-accent-contrast",
                        })}
                      >
                        Done
                      </button>
                    )}
                  />
                </div>
              )}
            />
          </div>
        )}
      />
    </ArkDialog.Root>
  );
}
