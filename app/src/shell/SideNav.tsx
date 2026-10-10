import { useLocation } from "@solidjs/router";
import { Dynamic } from "@solidjs/web";
import { For } from "solid-js";
import { t } from "../lib/i18n";
import { GopurLogo } from "./GopurLogo";
import { isNavItemActive, sidebarItems } from "./nav-config";

const NAV_LINK =
  "flex min-h-11 w-full items-center gap-3 rounded-pill px-3 py-2 text-sm font-medium text-text-muted no-underline hover:bg-surface-elevated aria-[current=page]:bg-accent-subtle aria-[current=page]:font-semibold aria-[current=page]:text-text md:justify-center lg:justify-start";

export function SideNav() {
  const location = useLocation();
  return (
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-[var(--shell-sidebar-width)] flex-col border-r border-divider bg-bg pt-[calc(8px+env(safe-area-inset-top))] md:flex"
      aria-label={t("shell.sideNav")}
    >
      <div class="mb-2 flex items-center justify-center px-2 lg:justify-start lg:px-4">
        <a href="/" class="flex size-11 items-center justify-center rounded-pill lg:hidden" aria-label="Gopur">
          <img src="/icons/favicon.svg" width="32" height="32" alt="" />
        </a>
        <div class="hidden w-full lg:block">
          <GopurLogo />
        </div>
      </div>
      <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-2 lg:px-3">
        <For each={sidebarItems()} keyed={(item) => item.href}>
          {(item) => (
            <a
              href={item().href}
              class={NAV_LINK}
              aria-current={isNavItemActive(location.pathname, item()) ? "page" : undefined}
            >
              <Dynamic component={item().icon} class="size-6 shrink-0" aria-hidden="true" />
              <span class="hidden truncate lg:inline">{item().label}</span>
            </a>
          )}
        </For>
      </nav>
    </aside>
  );
}
