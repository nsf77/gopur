import { Link, useRouterState } from "@tanstack/react-router";
import { hideTabBar, isNavItemActive, tabBarItems } from "./nav-config";

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (hideTabBar(pathname)) return null;
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-[640px] justify-center px-4 md:hidden"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
      aria-label="主導覽"
      data-shell-tabbar="true"
    >
      <div className="glass-surface pointer-events-auto flex h-16 w-full max-w-[640px] items-stretch justify-around rounded-full px-1">
        {tabBarItems().map((tab) => {
          const active = isNavItemActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-1 text-[10px] leading-tight text-text-muted no-underline"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`relative flex min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1 ${
                  active ? "bg-accent-subtle font-semibold text-accent" : "font-medium text-text-muted"
                }`}
              >
                <Icon className="size-6 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{tab.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
