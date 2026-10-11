import { useEffect, type ReactNode } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { m } from "../paraglide/messages.js";
import { hideTabBar, shellMode, titleFor } from "./nav-config";
import { SideNav } from "./SideNav";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";

export function AppShell(props: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = shellMode(pathname);
  const title = titleFor(pathname);
  useEffect(() => {
    document.title = m.site_documentTitle({ title });
  }, [title]);
  const bottomPad = hideTabBar(pathname)
    ? "pb-[env(safe-area-inset-bottom)]"
    : "max-md:pb-[var(--mobile-tab-bar-pad)] md:pb-[env(safe-area-inset-bottom)]";

  return (
    <div className={`gopur-shell-layout min-h-dvh bg-bg ${bottomPad}`} data-shell-layout={hideTabBar(pathname) ? "detail" : "tabs"}>
      <SideNav />
      <div className="gopur-shell-column mx-auto flex min-h-dvh w-full max-w-[640px] flex-col">
        <TopBar title={title} mode={mode} />
        <div className="flex-1">{props.children ?? <Outlet />}</div>
      </div>
      <TabBar />
    </div>
  );
}
