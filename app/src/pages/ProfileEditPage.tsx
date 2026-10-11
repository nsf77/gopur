import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import * as v from "valibot";
import { ApiError } from "../lib/api";
import { changedProfileFields, formFromUser, ProfileEditSchema, type ProfileEditValues } from "../lib/profile-form";
import { useMe, usePatchMe } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { AuthPrompt } from "../features/auth/AuthPrompt";
import { Button } from "../ui/Button";
import { SwitchField } from "../ui/Switch";
import { TextAreaField, TextField } from "../ui/TextField";

function issueMessage(issue: string): string {
  if (issue === "displayNameTooLong") return m.profileEdit_displayNameTooLong();
  if (issue === "invalidUsername") return m.profileEdit_invalidUsername();
  if (issue === "invalidEmail") return m.profileEdit_invalidEmail();
  if (issue === "invalidPhone") return m.profileEdit_invalidPhone();
  if (issue === "invalidAvatar") return m.profileEdit_invalidAvatar();
  if (issue === "bioTooLong") return m.profileEdit_bioTooLong();
  return m.common_error();
}

function patchError(err: unknown): string {
  if (!(err instanceof ApiError)) return m.errors_offline();
  const text = `${err.payload?.error ?? err.body}`.toLowerCase();
  if (text.includes("username_taken")) return m.profileEdit_usernameTaken();
  if (text.includes("invalid username")) return m.profileEdit_invalidUsername();
  if (text.includes("email already")) return m.profileEdit_emailInUse();
  if (text.includes("invalid email")) return m.profileEdit_invalidEmail();
  if (text.includes("invalid phone")) return m.profileEdit_invalidPhone();
  if (text.includes("invalid avatar")) return m.profileEdit_invalidAvatar();
  if (text.includes("display name")) return m.profileEdit_displayNameTooLong();
  if (text.includes("bio is too long")) return m.profileEdit_bioTooLong();
  return err.payload?.error || m.common_error();
}

export function ProfileEditPage() {
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const token = useSessionStore((s) => s.token);
  const stored = useSessionStore((s) => s.user);
  const me = useMe(Boolean(token));
  const patchMe = usePatchMe();
  const user = me.data ?? stored;
  const [form, setForm] = useState<ProfileEditValues>(() =>
    user ? formFromUser(user) : formFromUser({
      id: "",
      language: "en",
      age: null,
      is_teen: false,
      is_private: false,
      is_verified: false,
      imported: false,
      needs_onboarding: false,
      onboarding_missing: [],
      credit_score: 0,
      role: "user",
    }),
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (me.data) setForm(formFromUser(me.data));
  }, [me.data]);

  useEffect(() => {
    if (!signedIn) void navigate({ to: "/login", search: { next: "/profile/edit" }, replace: true });
  }, [signedIn, navigate]);

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-md">
        <AuthPrompt next="/profile/edit" message={m.auth_signInRequired()} />
      </main>
    );
  }

  const loaded = Boolean(user);
  const patch = (next: Partial<ProfileEditValues>) => {
    setForm((current) => ({ ...current, ...next }));
    setError("");
    setNotice("");
  };

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.profileEdit_edit()}</h1>
      {me.isPending && !loaded ? <p className="text-sm text-text-muted">{m.common_loading()}</p> : null}
      {loaded ? (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = v.safeParse(ProfileEditSchema, form);
            if (!parsed.success) {
              setError(issueMessage(parsed.issues[0]?.message ?? ""));
              return;
            }
            if (!user) return;
            const initial = formFromUser(user);
            const body = changedProfileFields(initial, parsed.output);
            if (Object.keys(body).length === 0) return;
            patchMe.mutate(body, {
              onSuccess: (next) => {
                setForm(formFromUser(next));
                setNotice(m.profileEdit_saved());
              },
              onError: (err) => setError(patchError(err)),
            });
          }}
        >
          {error ? (
            <p className="m-0 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}
          <TextField
            label={m.profileEdit_displayName()}
            value={form.display_name}
            onValueChange={(display_name) => patch({ display_name })}
          />
          <TextField
            label={m.profileEdit_username()}
            value={form.username}
            onValueChange={(username) => patch({ username })}
          />
          <TextField
            label={m.profileEdit_email()}
            type="email"
            value={form.email}
            onValueChange={(email) => patch({ email })}
          />
          <TextField label={m.profileEdit_phone()} value={form.phone} onValueChange={(phone) => patch({ phone })} />
          <TextField
            label={m.profileEdit_avatarUrl()}
            type="url"
            value={form.avatar_url}
            onValueChange={(avatar_url) => patch({ avatar_url })}
          />
          <TextAreaField label={m.profileEdit_bio()} value={form.bio} onValueChange={(bio) => patch({ bio })} />
          <div className="flex flex-col gap-1">
            <SwitchField
              label={m.profileEdit_private()}
              checked={form.is_private}
              disabled={user?.is_verified === true}
              onCheckedChange={(is_private) => patch({ is_private })}
            />
            <p className="m-0 text-sm text-text-muted">{m.profileEdit_privateHint()}</p>
            {user?.is_verified ? <p className="m-0 text-sm text-text-muted">{m.profileEdit_verifiedPublic()}</p> : null}
            {user?.is_teen ? <p className="m-0 text-sm text-text-muted">{m.profileEdit_teenPrivate()}</p> : null}
          </div>
          <Button type="submit" disabled={patchMe.isPending} width="full">
            {patchMe.isPending ? m.common_loading() : m.profileEdit_save()}
          </Button>
        </form>
      ) : null}
      {notice ? (
        <p className="text-sm text-text-muted" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
