import type { LinkProps } from "@tanstack/react-router";
import type { Icon } from "@phosphor-icons/react";
import {
  BellIcon,
  CalendarDotsIcon,
  ChatCircleIcon,
  CompassIcon,
  GearIcon,
  HouseIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { m } from "../paraglide/messages.js";

export type NavHref = NonNullable<LinkProps["to"]>;

export type NavItem = {
  href: NavHref;
  label: string;
  icon: Icon;
};

export function tabBarItems(): NavItem[] {
  return [
    { href: "/", label: m.tabs_home(), icon: HouseIcon },
    { href: "/explore", label: m.tabs_explore(), icon: CompassIcon },
    { href: "/chat", label: m.tabs_chat(), icon: ChatCircleIcon },
    { href: "/my-events", label: m.tabs_myEvents(), icon: CalendarDotsIcon },
    { href: "/profile", label: m.tabs_profile(), icon: UserCircleIcon },
  ];
}

export function sidebarItems(): NavItem[] {
  return [
    ...tabBarItems().filter((item) => item.href !== "/chat"),
    { href: "/notifications", label: m.notifications_title(), icon: BellIcon },
    { href: "/settings", label: m.settings_title(), icon: GearIcon },
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
    pathname.startsWith("/chat/") ||
    pathname === "/profile/edit"
  ) {
    return "detail";
  }
  return "primary";
}

export function hideTabBar(pathname: string): boolean {
  return (
    pathname.startsWith("/event/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/chat/") ||
    pathname === "/profile/edit"
  );
}

export function titleFor(pathname: string): string {
  if (pathname === "/") return m.home_title();
  if (pathname.startsWith("/explore")) return m.tabs_explore();
  if (pathname === "/profile/edit") return m.profileEdit_edit();
  if (pathname.startsWith("/profile")) return m.profile_title();
  if (pathname.startsWith("/settings")) return m.settings_title();
  if (pathname.startsWith("/login")) return m.auth_welcome();
  if (pathname.startsWith("/chat")) return m.tabs_chat();
  if (pathname.startsWith("/my-events")) return m.tabs_myEvents();
  if (pathname.startsWith("/notifications")) return m.notifications_title();
  if (pathname === "/event/new") return m.eventEditor_createTitle();
  if (pathname.endsWith("/edit") && pathname.startsWith("/event/")) return m.eventEditor_editTitle();
  if (pathname.startsWith("/event/")) return m.event_title();
  return "Gopur";
}
