import { useLocation } from "@solidjs/router";
import { Dynamic } from "@solidjs/web";
import { For, Show } from "solid-js";
import { hideTabBar, isNavItemActive, tabBarItems } from "./nav-config";

export function TabBar() {
  const location = useLocation();
  return (
    <Show when={!hideTabBar(location.pathname)}>
      <nav
        class="pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-[640px] justify-center px-4 md:hidden"
        style={{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        aria-label="主導覽"
        data-shell-tabbar="true"
      >
        <div class="glass-surface pointer-events-auto flex h-16 w-full max-w-[640px] items-stretch justify-around rounded-full px-1">
          <For each={tabBarItems()} keyed={(tab) => tab.href}>
            {(tab) => {
              const active = () => isNavItemActive(location.pathname, tab());
              return (
                <a
                  href={tab().href}
                  class="relative flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-1 text-[10px] leading-tight text-text-muted no-underline"
                  aria-current={active() ? "page" : undefined}
                >
                  <span
                    class={`relative flex min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1 ${
                      active() ? "bg-accent-subtle font-semibold text-accent" : "font-medium text-text-muted"
                    }`}
                  >
                    <Dynamic component={tab().icon} class="size-6 shrink-0" aria-hidden="true" />
                    <span class="max-w-full truncate">{tab().label}</span>
                  </span>
                </a>
              );
            }}
          </For>
        </div>
      </nav>
    </Show>
  );
}
