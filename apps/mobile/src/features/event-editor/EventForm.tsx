import { useState } from "react";
import { Text, View } from "react-native";
import {
  DISTRICTS,
  clearedLockedFields,
  parseEventDraft,
  type EventDraft,
} from "@gopur/shared";
import { m } from "../../paraglide/messages.js";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";

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
    <View className="gap-3 px-4 pb-8">
      {inline || props.error ? <Text className="text-sm text-accent">{inline || props.error}</Text> : null}
      <TextField label={m.eventEditor_titleEn()} value={draft.titleEn} onChangeText={(titleEn) => patch({ titleEn })} />
      <TextField label={m.eventEditor_titleZh()} value={draft.titleZh} onChangeText={(titleZh) => patch({ titleZh })} />
      <TextField
        label={m.eventEditor_descriptionEn()}
        value={draft.descriptionEn}
        multiline
        onChangeText={(descriptionEn) => patch({ descriptionEn })}
      />
      <TextField
        label={m.eventEditor_descriptionZh()}
        value={draft.descriptionZh}
        multiline
        onChangeText={(descriptionZh) => patch({ descriptionZh })}
      />
      <TextField label={m.eventEditor_locationEn()} value={draft.locationEn} onChangeText={(locationEn) => patch({ locationEn })} />
      <TextField label={m.eventEditor_locationZh()} value={draft.locationZh} onChangeText={(locationZh) => patch({ locationZh })} />
      <TextField label={m.eventEditor_starts()} value={draft.startsAt} placeholder="YYYY-MM-DD HH:mm" onChangeText={(startsAt) => patch({ startsAt })} />
      <TextField label={m.eventEditor_ends()} value={draft.endsAt} placeholder="YYYY-MM-DD HH:mm" onChangeText={(endsAt) => patch({ endsAt })} />
      <Text className="text-xs text-text-muted">{m.eventEditor_whenHint()}</Text>
      <TextField label={m.eventEditor_type()} value={draft.type} onChangeText={(type) => patch({ type: type as EventDraft["type"] })} />
      <TextField
        label={m.eventEditor_district()}
        value={draft.district}
        placeholder={DISTRICTS.slice(0, 3).join(", ")}
        onChangeText={(district) => patch({ district })}
      />
      <TextField label={m.eventEditor_price()} value={draft.priceHkd} keyboardType="numeric" onChangeText={(priceHkd) => patch({ priceHkd })} />
      <TextField label={m.eventEditor_priceNote()} value={draft.priceNote} onChangeText={(priceNote) => patch({ priceNote })} />
      <TextField label={m.eventEditor_capacityLabel()} value={draft.capacity} keyboardType="numeric" onChangeText={(capacity) => patch({ capacity })} />
      <TextField label={m.eventEditor_ageMin()} value={draft.ageMin} keyboardType="numeric" onChangeText={(ageMin) => patch({ ageMin })} />
      <TextField label={m.eventEditor_ageMax()} value={draft.ageMax} keyboardType="numeric" onChangeText={(ageMax) => patch({ ageMax })} />
      <TextField label={m.eventEditor_ageMode()} value={draft.ageMode} onChangeText={(ageMode) => patch({ ageMode: ageMode as EventDraft["ageMode"] })} />
      <TextField label={m.eventEditor_joinMode()} value={draft.joinMode} onChangeText={(joinMode) => patch({ joinMode: joinMode as EventDraft["joinMode"] })} />
      <TextField label={m.eventEditor_latitude()} value={draft.latitude} onChangeText={(latitude) => patch({ latitude })} />
      <TextField label={m.eventEditor_longitude()} value={draft.longitude} onChangeText={(longitude) => patch({ longitude })} />
      <TextField label={m.eventEditor_cover()} value={draft.coverImageUrl} keyboardType="url" onChangeText={(coverImageUrl) => patch({ coverImageUrl })} />
      <Button
        loading={props.pending}
        disabled={props.pending}
        label={props.mode === "create" ? m.eventEditor_submit() : m.eventEditor_saveChanges()}
        onPress={() => {
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
      />
    </View>
  );
}
