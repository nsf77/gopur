import { t } from "../lib/i18n";

export default function StubPage(props: { message: string }) {
  return (
    <main class="p-4 pb-24">
      <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("common.comingSoon")}</h1>
      <p class="mt-2 text-sm text-text-muted">{props.message}</p>
    </main>
  );
}
