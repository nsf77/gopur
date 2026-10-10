import { useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { O, pipe } from "../../lib/belt";
import { t } from "../../lib/i18n";
import { currentUser, isSignedIn, updateUser } from "../../lib/session";
import { patchMe } from "../../lib/api";
import { useMe } from "../../lib/queries";
import { Button } from "../../ui/Button";
import { SwitchField } from "../../ui/Switch";

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const meQuery = useMe();
  const [saving, setSaving] = createSignal(false);
  const user = () =>
    pipe(
      currentUser(),
      O.match(
        (sessionUser) => meQuery.data ?? sessionUser,
        () => undefined,
      ),
    );
  const [displayName, setDisplayName] = createSignal(user()?.display_name ?? "");
  const [username, setUsername] = createSignal(user()?.username ?? "");
  const [bio, setBio] = createSignal(user()?.bio ?? "");
  const [isPrivate, setIsPrivate] = createSignal(user()?.is_private ?? false);
  const [notice, setNotice] = createSignal("");

  if (!isSignedIn()) {
    navigate("/login?next=%2Fprofile%2Fedit", { replace: true });
    return null;
  }

  const onSubmit = async (event: Event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await patchMe({
        display_name: displayName(),
        username: username(),
        bio: bio(),
        is_private: isPrivate(),
      });
      updateUser(saved);
      setNotice(t("profileEdit.saved"));
    } catch {
      setNotice(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main class="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("profileEdit.edit")}</h1>
      <Show when={notice()}>
        <p class="m-0 text-sm text-accent">{notice()}</p>
      </Show>
      <form class="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
        <label class="grid gap-1 text-sm font-medium">
          {t("profileEdit.displayName")}
          <input class="min-h-11 rounded-md border border-divider px-3" value={displayName()} onInput={(e) => setDisplayName(e.currentTarget.value)} />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          {t("profileEdit.username")}
          <input class="min-h-11 rounded-md border border-divider px-3" value={username()} onInput={(e) => setUsername(e.currentTarget.value)} />
        </label>
        <label class="grid gap-1 text-sm font-medium">
          {t("profileEdit.bio")}
          <textarea class="min-h-24 rounded-md border border-divider px-3 py-2" value={bio()} onInput={(e) => setBio(e.currentTarget.value)} />
        </label>
        <SwitchField checked={isPrivate()} label={t("profileEdit.private")} onChange={setIsPrivate} />
        <Button type="submit" disabled={saving()}>
          {t("profileEdit.save")}
        </Button>
      </form>
    </main>
  );
}
