import IconBell from "~icons/lucide/bell";
import IconCalendarDays from "~icons/lucide/calendar-days";
import IconCircleUserRound from "~icons/lucide/circle-user-round";
import IconCompass from "~icons/lucide/compass";
import IconHouse from "~icons/lucide/house";
import IconMessageCircle from "~icons/lucide/message-circle";
import IconSettings from "~icons/lucide/settings";
import { t } from "../lib/i18n";

type LucideIcon = typeof IconHouse;

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function tabBarItems(): NavItem[] {
  return [
    { href: "/", label: t("tabs.home"), icon: IconHouse },
    { href: "/explore", label: t("tabs.explore"), icon: IconCompass },
    { href: "/chat", label: t("tabs.chat"), icon: IconMessageCircle },
    { href: "/my-events", label: t("tabs.myEvents"), icon: IconCalendarDays },
    { href: "/profile", label: t("tabs.profile"), icon: IconCircleUserRound },
  ];
}

export function sidebarItems(): NavItem[] {
  return [
    ...tabBarItems().filter((item) => item.href !== "/chat"),
    { href: "/notifications", label: t("notifications.title"), icon: IconBell },
    { href: "/settings", label: t("settings.title"), icon: IconSettings },
  ];
}

export function isNavItemActive(pathname: string, item: Pick<NavItem, "href">): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/");
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function shellMode(pathname: string): "home" | "explore" | "detail" | "primary" {
  if (pathname === "/") return "home";
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return "explore";
  if (
    pathname.startsWith("/event/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/organizer/") ||
    pathname.startsWith("/chat/")
  ) {
    return "detail";
  }
  return "primary";
}

export function hideTabBar(pathname: string): boolean {
  return (
    pathname.startsWith("/event/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/profile/edit") ||
    pathname.startsWith("/chat/")
  );
}
