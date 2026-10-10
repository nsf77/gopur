import type { JSX } from "@solidjs/web";
import { useLocation } from "@solidjs/router";
import { createEffect, createMemo } from "solid-js";
import { documentTitle, t } from "../lib/i18n";
import { hideTabBar, shellMode } from "./nav-config";
import { SideNav } from "./SideNav";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";

function titleFor(pathname: string): string {
  if (pathname === "/") return t("home.title");
  if (pathname.startsWith("/explore")) return t("tabs.explore");
  if (pathname.startsWith("/profile")) return t("profile.title");
  if (pathname.startsWith("/settings")) return t("settings.title");
  if (pathname.startsWith("/login")) return t("auth.welcome");
  if (pathname.startsWith("/chat")) return t("tabs.chat");
  if (pathname.startsWith("/my-events")) return t("tabs.myEvents");
  if (pathname.startsWith("/event/")) return t("tabs.home");
  return "Gopur";
}

export function AppShell(props: { children: JSX.Element }) {
  const location = useLocation();
  const mode = createMemo(() => shellMode(location.pathname));
  const title = createMemo(() => titleFor(location.pathname));
  createEffect(title, (value) => {
    document.title = documentTitle(value);
  });
  const bottomPad = () =>
    hideTabBar(location.pathname)
      ? "pb-[env(safe-area-inset-bottom)]"
      : "max-md:pb-[var(--mobile-tab-bar-pad)] md:pb-[env(safe-area-inset-bottom)]";

  return (
    <div class={`gopur-shell-layout min-h-dvh bg-bg ${bottomPad()}`} data-shell-layout={hideTabBar(location.pathname) ? "detail" : "tabs"}>
      <SideNav />
      <div class="gopur-shell-column mx-auto flex min-h-dvh w-full max-w-[640px] flex-col">
        <TopBar title={title()} mode={mode()} />
        <div class="flex-1">{props.children}</div>
      </div>
      <TabBar />
    </div>
  );
}
