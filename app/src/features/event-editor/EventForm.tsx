import { useState } from "react";
import { Input } from "@cloudflare/kumo/components/input";
import { Select } from "@cloudflare/kumo/components/select";
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
      <Select
        label={m.eventEditor_district()}
        value={draft.district || null}
        onValueChange={(district) => patch({ district: typeof district === "string" ? district : "" })}
        items={[{ label: "—", value: "" }, ...DISTRICTS.map((id) => ({ label: id, value: id }))]}
      />
      <p className="m-0 text-sm font-semibold">{m.eventEditor_type()}</p>
      <RadioGroup
        name="event-type"
        aria-label={m.eventEditor_type()}
        value={draft.type}
        onValueChange={(type) => patch({ type: type as EventDraft["type"] })}
        options={[
          { value: "volunteer", label: m.explore_filterVolunteer() },
          { value: "community", label: m.explore_filterCommunity() },
          { value: "class", label: m.explore_filterClass() },
          { value: "official", label: m.explore_filterOfficial() },
        ]}
      />
      <Input
        label={m.eventEditor_starts()}
        type="datetime-local"
        value={toInputTime(draft.startsAt)}
        onValueChange={(startsAt) => patch({ startsAt: fromInputTime(startsAt) })}
      />
      <Input
        label={m.eventEditor_ends()}
        type="datetime-local"
        value={toInputTime(draft.endsAt)}
        onValueChange={(endsAt) => patch({ endsAt: fromInputTime(endsAt) })}
      />
      <p className="m-0 text-xs text-text-muted">{m.eventEditor_whenHint()}</p>
      <Select
        label={m.eventEditor_recurrence()}
        value={draft.recurrence || "none"}
        onValueChange={(recurrence) =>
          patch({ recurrence: typeof recurrence === "string" ? recurrence : "none" })
        }
        items={[
          { label: "none", value: "none" },
          { label: "daily", value: "daily" },
          { label: "weekly", value: "weekly" },
          { label: "monthly", value: "monthly" },
        ]}
      />
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
        aria-label={m.eventEditor_ageMode()}
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
        aria-label={m.eventEditor_joinMode()}
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
