import { useNavigate } from "@solidjs/router";
import IconArrowLeft from "~icons/lucide/arrow-left";
import IconSettings from "~icons/lucide/settings";
import { Show } from "solid-js";
import { GopurLogo } from "./GopurLogo";
import { t } from "../lib/i18n";
import type { shellMode } from "./nav-config";

export function TopBar(props: { title: string; mode: ReturnType<typeof shellMode> }) {
  const navigate = useNavigate();
  return (
    <header
      class="glass-surface sticky top-0 z-40 px-3 pb-2 pt-[calc(8px+env(safe-area-inset-top))] md:border-b md:border-divider"
      data-shell-topbar={props.mode}
    >
      <Show when={props.mode === "home"}>
        <div class="flex min-h-11 items-center justify-between">
          <GopurLogo />
          <a href="/settings" class="flex size-11 items-center justify-center rounded-full" aria-label={t("settings.title")}>
            <IconSettings class="size-6" />
          </a>
        </div>
      </Show>
      <Show when={props.mode === "explore"}>
        <h1 class="m-0 truncate text-lg font-bold tracking-tight">{props.title}</h1>
      </Show>
      <Show when={props.mode === "primary"}>
        <div class="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <span />
          <h1 class="m-0 truncate text-center text-lg font-bold tracking-tight md:text-left">{props.title}</h1>
          <a href="/settings" class="flex size-11 items-center justify-center rounded-full md:hidden" aria-label={t("settings.title")}>
            <IconSettings class="size-6" />
          </a>
        </div>
      </Show>
      <Show when={props.mode === "detail"}>
        <div class="flex min-h-11 items-center gap-2">
          <button
            type="button"
            class="flex size-11 items-center justify-center rounded-full"
            aria-label={t("common.back")}
            onClick={() => (history.length > 1 ? history.back() : navigate("/"))}
          >
            <IconArrowLeft class="size-6" />
          </button>
          <h1 class="m-0 truncate text-lg font-bold tracking-tight">{props.title}</h1>
        </div>
      </Show>
    </header>
  );
}
