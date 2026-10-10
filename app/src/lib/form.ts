import { FormApi } from "@tanstack/form-core";
import { createMemo, createSignal, createUniqueId, onSettled } from "solid-js";

type FormValidateFn<TFormData> = (args: { value: TFormData }) => unknown;

export function createForm<TFormData>(opts: () => {
  defaultValues: TFormData;
  onSubmit: (args: { value: TFormData }) => void;
  validators?: { onChange?: FormValidateFn<TFormData>; onSubmit?: FormValidateFn<TFormData> };
}) {
  const options = opts();
  const api = new FormApi({
    canSubmitWhenInvalid: true,
    defaultValues: options.defaultValues,
    formId: createUniqueId(),
    validators: options.validators,
    onSubmit: options.onSubmit,
  } as never);

  const [version, setVersion] = createSignal(0, { equals: false });
  onSettled(() => {
    const unmount = api.mount();
    const sub = api.store.subscribe(() => setVersion((n) => n + 1));
    return () => {
      sub.unsubscribe();
      unmount();
    };
  });

  const values = createMemo(() => {
    version();
    return api.store.state.values as TFormData;
  });

  return { api, values };
}
