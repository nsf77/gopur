import { useState } from "react";
import {
  DISTRICTS,
  clearedLockedFields,
  fromInputTime,
  parseEventDraft,
  toInputTime,
  type EventDraft,
} from "../../lib/event-draft";
import { m } from "../../paraglide/messages.js";
import { Button } from "../../ui/Button";
import { RadioGroup } from "../../ui/RadioGroup";
import { fieldLabel, selectInput, textInput } from "../../ui/styles";
import { TextAreaField, TextField } from "../../ui/TextField";

function draftErrorMessage(error: string): string {
  if (error === "when") return m.eventEditor_errors_when();
  if (error === "order") return m.eventEditor_errors_order();
  if (error === "pin") return m.eventEditor_errors_pin();
  if (error === "age") return m.eventEditor_errors_age();
  if (error === "capacity") return m.eventEditor_errors_capacity();
  if (error === "price") return m.eventEditor_errors_price();
  if (error === "cover") return m.eventEditor_errors_cover();
  return m.eventEditor_errors_title();
}

export function EventForm(props: {
  initial: EventDraft;
  mode: "create" | "edit";
  pending: boolean;
  error?: string;
  lockedInitial?: EventDraft;
  onClearBlocked?: () => void;
  onSubmit: (draft: EventDraft) => void;
}) {
  const [draft, setDraft] = useState(props.initial);
  const [inline, setInline] = useState("");

  const patch = (next: Partial<EventDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setInline("");
  };

  return (
    <form
      className="flex flex-col gap-3 px-4 pb-8"
      data-testid="event-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (props.lockedInitial && clearedLockedFields(props.lockedInitial, draft).length > 0) {
          props.onClearBlocked?.();
          return;
        }
        const parsed = parseEventDraft(draft);
        if (!parsed.ok) {
          setInline(draftErrorMessage(parsed.error));
          return;
        }
        props.onSubmit(parsed.value);
      }}
    >
      <TextField label={m.eventEditor_titleEn()} value={draft.titleEn} onValueChange={(titleEn) => patch({ titleEn })} />
      <TextField label={m.eventEditor_titleZh()} value={draft.titleZh} onValueChange={(titleZh) => patch({ titleZh })} />
      <TextAreaField
        label={m.eventEditor_descriptionEn()}
        value={draft.descriptionEn}
        onValueChange={(descriptionEn) => patch({ descriptionEn })}
      />
      <TextAreaField
        label={m.eventEditor_descriptionZh()}
        value={draft.descriptionZh}
        onValueChange={(descriptionZh) => patch({ descriptionZh })}
      />
      <TextField
        label={m.eventEditor_locationEn()}
        value={draft.locationEn}
        onValueChange={(locationEn) => patch({ locationEn })}
      />
      <TextField
        label={m.eventEditor_locationZh()}
        value={draft.locationZh}
        onValueChange={(locationZh) => patch({ locationZh })}
      />
      <label className="grid gap-1">
        <span className={fieldLabel()}>{m.eventEditor_district()}</span>
        <select className={selectInput()} value={draft.district} onChange={(event) => patch({ district: event.currentTarget.value })}>
          <option value="">—</option>
          {DISTRICTS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <p className="m-0 text-sm font-semibold">{m.eventEditor_type()}</p>
      <RadioGroup
        name="event-type"
        value={draft.type}
        onValueChange={(type) => patch({ type: type as EventDraft["type"] })}
        options={[
          { value: "volunteer", label: m.explore_filterVolunteer() },
          { value: "community", label: m.explore_filterCommunity() },
          { value: "class", label: m.explore_filterClass() },
          { value: "official", label: m.explore_filterOfficial() },
        ]}
      />
      <label className="grid gap-1">
        <span className={fieldLabel()}>{m.eventEditor_starts()}</span>
        <input
          type="datetime-local"
          className={textInput()}
          value={toInputTime(draft.startsAt)}
          onChange={(event) => patch({ startsAt: fromInputTime(event.currentTarget.value) })}
        />
      </label>
      <label className="grid gap-1">
        <span className={fieldLabel()}>{m.eventEditor_ends()}</span>
        <input
          type="datetime-local"
          className={textInput()}
          value={toInputTime(draft.endsAt)}
          onChange={(event) => patch({ endsAt: fromInputTime(event.currentTarget.value) })}
        />
      </label>
      <p className="m-0 text-xs text-text-muted">{m.eventEditor_whenHint()}</p>
      <label className="grid gap-1">
        <span className={fieldLabel()}>{m.eventEditor_recurrence()}</span>
        <select
          className={selectInput()}
          value={draft.recurrence || "none"}
          onChange={(event) => patch({ recurrence: event.currentTarget.value })}
        >
          <option value="none">none</option>
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
        </select>
      </label>
      <TextField
        label={m.eventEditor_price()}
        value={draft.priceHkd}
        inputMode="decimal"
        onValueChange={(priceHkd) => patch({ priceHkd })}
      />
      <p className="m-0 text-xs text-text-muted">{m.eventEditor_priceHint()}</p>
      <TextField label={m.eventEditor_priceNote()} value={draft.priceNote} onValueChange={(priceNote) => patch({ priceNote })} />
      <TextField
        label={m.eventEditor_capacityLabel()}
        value={draft.capacity}
        inputMode="numeric"
        onValueChange={(capacity) => patch({ capacity })}
      />
      <TextField
        label={m.eventEditor_ageMin()}
        value={draft.ageMin}
        inputMode="numeric"
        onValueChange={(ageMin) => patch({ ageMin })}
      />
      <TextField
        label={m.eventEditor_ageMax()}
        value={draft.ageMax}
        inputMode="numeric"
        onValueChange={(ageMax) => patch({ ageMax })}
      />
      <p className="m-0 text-sm font-semibold">{m.eventEditor_ageMode()}</p>
      <RadioGroup
        name="age-mode"
        value={draft.ageMode}
        onValueChange={(ageMode) => patch({ ageMode: ageMode as EventDraft["ageMode"] })}
        options={[
          { value: "suggested", label: m.eventEditor_ageSuggested() },
          { value: "strict", label: m.eventEditor_ageStrict() },
        ]}
      />
      <p className="m-0 text-sm font-semibold">{m.eventEditor_joinMode()}</p>
      <RadioGroup
        name="join-mode"
        value={draft.joinMode}
        onValueChange={(joinMode) => patch({ joinMode: joinMode as EventDraft["joinMode"] })}
        options={[
          { value: "instant", label: m.eventEditor_instant() },
          { value: "approval", label: m.eventEditor_approval() },
        ]}
      />
      <TextField
        label={m.eventEditor_latitude()}
        value={draft.latitude}
        inputMode="decimal"
        onValueChange={(latitude) => patch({ latitude })}
      />
      <TextField
        label={m.eventEditor_longitude()}
        value={draft.longitude}
        inputMode="decimal"
        onValueChange={(longitude) => patch({ longitude })}
      />
      <p className="m-0 text-xs text-text-muted">{m.eventEditor_pinHint()}</p>
      <TextField
        label={m.eventEditor_cover()}
        type="url"
        value={draft.coverImageUrl}
        onValueChange={(coverImageUrl) => patch({ coverImageUrl })}
      />
      <p className="m-0 text-xs text-text-muted">{m.eventEditor_coverUrlHint()}</p>
      {inline || props.error ? (
        <p className="m-0 text-sm text-accent" role="alert">
          {inline || props.error}
        </p>
      ) : null}
      <Button type="submit" disabled={props.pending} width="full">
        {props.pending
          ? m.common_loading()
          : props.mode === "create"
            ? m.eventEditor_submit()
            : m.eventEditor_saveChanges()}
      </Button>
    </form>
  );
}
