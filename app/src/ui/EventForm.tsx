import { For, Show } from "solid-js";
import { createForm } from "../lib/form";
import { t } from "../lib/i18n";
import { DISTRICTS, eventDraftFormError, type EventDraft } from "../lib/event-draft";

const FIELD =
  "mb-3 block w-full min-h-11 rounded-xl border border-divider bg-surface px-3 py-2 text-base text-text outline-none";

function toInputTime(value: string): string {
  return value.trim().replace(" ", "T");
}

function fromInputTime(value: string): string {
  return value.trim().replace("T", " ");
}

export function EventForm(props: {
  initial: EventDraft;
  mode: "create" | "edit";
  pending: boolean;
  error: string;
  onSubmit: (draft: EventDraft) => void;
}) {
  const { api, values } = createForm<EventDraft>(() => ({
    defaultValues: props.initial,
    canSubmitWhenInvalid: true,
    validators: {
      onChange: ({ value }: { value: EventDraft }) => eventDraftFormError(value),
      onSubmit: ({ value }: { value: EventDraft }) => eventDraftFormError(value),
    },
    onSubmit: ({ value }: { value: EventDraft }) => {
      props.onSubmit(value);
    },
  }));

  const patch = (next: Partial<EventDraft>) => {
    for (const [key, val] of Object.entries(next)) {
      api.setFieldValue(key as keyof EventDraft, val as EventDraft[keyof EventDraft]);
    }
  };

  const formError = () => {
    if (api.store.state.submissionAttempts === 0) return props.error;
    const first = api.store.state.errors[0];
    if (typeof first === "string") return first;
    return props.error;
  };

  return (
    <form
      class="flex flex-col pb-8"
      novalidate
      onSubmit={(event) => {
        event.preventDefault();
        void api.handleSubmit();
      }}
    >
      <label class="text-sm font-semibold">Title (EN)</label>
      <input class={FIELD} value={values().titleEn} onInput={(e) => patch({ titleEn: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Title (ZH)</label>
      <input class={FIELD} value={values().titleZh} onInput={(e) => patch({ titleZh: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Description (EN)</label>
      <textarea class={`${FIELD} min-h-24`} value={values().descriptionEn} onInput={(e) => patch({ descriptionEn: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Description (ZH)</label>
      <textarea class={`${FIELD} min-h-24`} value={values().descriptionZh} onInput={(e) => patch({ descriptionZh: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Location (EN)</label>
      <input class={FIELD} value={values().locationEn} onInput={(e) => patch({ locationEn: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Location (ZH)</label>
      <input class={FIELD} value={values().locationZh} onInput={(e) => patch({ locationZh: e.currentTarget.value })} />
      <label class="text-sm font-semibold">District</label>
      <select class={FIELD} value={values().district} onChange={(e) => patch({ district: e.currentTarget.value })}>
        <option value="">—</option>
        <For each={[...DISTRICTS]} keyed={(id) => id}>
          {(id) => <option value={id()}>{id()}</option>}
        </For>
      </select>
      <label class="text-sm font-semibold">Type</label>
      <select class={FIELD} value={values().type} onChange={(e) => patch({ type: e.currentTarget.value as EventDraft["type"] })}>
        <option value="volunteer">volunteer</option>
        <option value="community">community</option>
        <option value="class">class</option>
        <option value="official">official</option>
      </select>
      <label class="text-sm font-semibold">Starts</label>
      <input
        type="datetime-local"
        class={FIELD}
        value={toInputTime(values().startsAt)}
        onInput={(e) => patch({ startsAt: fromInputTime(e.currentTarget.value) })}
      />
      <label class="text-sm font-semibold">Ends</label>
      <input
        type="datetime-local"
        class={FIELD}
        value={toInputTime(values().endsAt)}
        onInput={(e) => patch({ endsAt: fromInputTime(e.currentTarget.value) })}
      />
      <label class="text-sm font-semibold">Recurrence</label>
      <select class={FIELD} value={values().recurrence || "none"} onChange={(e) => patch({ recurrence: e.currentTarget.value })}>
        <option value="none">none</option>
        <option value="daily">daily</option>
        <option value="weekly">weekly</option>
        <option value="monthly">monthly</option>
      </select>
      <label class="text-sm font-semibold">Price (HKD)</label>
      <input class={FIELD} inputmode="decimal" value={values().priceHkd} onInput={(e) => patch({ priceHkd: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Price note</label>
      <input class={FIELD} value={values().priceNote} onInput={(e) => patch({ priceNote: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Capacity</label>
      <input class={FIELD} inputmode="numeric" value={values().capacity} onInput={(e) => patch({ capacity: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Age min</label>
      <input class={FIELD} inputmode="numeric" value={values().ageMin} onInput={(e) => patch({ ageMin: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Age max</label>
      <input class={FIELD} inputmode="numeric" value={values().ageMax} onInput={(e) => patch({ ageMax: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Age mode</label>
      <select class={FIELD} value={values().ageMode} onChange={(e) => patch({ ageMode: e.currentTarget.value as EventDraft["ageMode"] })}>
        <option value="suggested">suggested</option>
        <option value="strict">strict</option>
      </select>
      <label class="text-sm font-semibold">Join mode</label>
      <select class={FIELD} value={values().joinMode} onChange={(e) => patch({ joinMode: e.currentTarget.value as EventDraft["joinMode"] })}>
        <option value="instant">instant</option>
        <option value="approval">approval</option>
      </select>
      <label class="text-sm font-semibold">Latitude</label>
      <input class={FIELD} inputmode="decimal" value={values().latitude} onInput={(e) => patch({ latitude: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Longitude</label>
      <input class={FIELD} inputmode="decimal" value={values().longitude} onInput={(e) => patch({ longitude: e.currentTarget.value })} />
      <label class="text-sm font-semibold">Cover image URL</label>
      <input class={FIELD} type="url" value={values().coverImageUrl} onInput={(e) => patch({ coverImageUrl: e.currentTarget.value })} />
      <Show when={formError()}>
        <p class="m-0 text-sm text-red-700" role="alert">
          {formError()}
        </p>
      </Show>
      <button
        type="submit"
        class="mt-3 min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast disabled:opacity-50"
        disabled={props.pending}
      >
        {props.mode === "create" ? t("editor.create") : t("editor.save")}
      </button>
    </form>
  );
}
