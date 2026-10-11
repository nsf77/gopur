import { Link, useRouterState } from "@tanstack/react-router";
import { m } from "../paraglide/messages.js";
import { GopurLogo } from "./GopurLogo";
import { isNavItemActive, sidebarItems } from "./nav-config";

const NAV_LINK =
  "flex min-h-11 w-full items-center gap-3 rounded-pill px-3 py-2 text-sm font-medium text-text-muted no-underline hover:bg-surface-elevated aria-[current=page]:bg-accent-subtle aria-[current=page]:font-semibold aria-[current=page]:text-text md:justify-center lg:justify-start";

export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[var(--shell-sidebar-width)] flex-col border-r border-divider bg-bg pt-[calc(8px+env(safe-area-inset-top))] md:flex"
      aria-label={m.shell_sideNav()}
    >
      <div className="mb-2 flex items-center justify-center px-2 lg:justify-start lg:px-4">
        <Link to="/" className="flex size-11 items-center justify-center rounded-pill lg:hidden" aria-label="Gopur">
          <img src="/icons/favicon.svg" width="32" height="32" alt="" />
        </Link>
        <div className="hidden w-full lg:block">
          <GopurLogo />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 lg:px-3">
        {sidebarItems().map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={NAV_LINK}
              aria-current={isNavItemActive(pathname, item) ? "page" : undefined}
            >
              <Icon className="size-6 shrink-0" aria-hidden="true" />
              <span className="hidden truncate lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
