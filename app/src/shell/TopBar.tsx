import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, GearIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "../paraglide/messages.js";
import { GopurLogo } from "./GopurLogo";
import type { shellMode } from "./nav-config";

export function TopBar(props: { title: string; mode: ReturnType<typeof shellMode> }) {
  const navigate = useNavigate();
  return (
    <header
      className="glass-surface sticky top-0 z-40 px-3 pb-2 pt-[calc(8px+env(safe-area-inset-top))] md:border-b md:border-divider"
      data-shell-topbar={props.mode}
    >
      {props.mode === "home" ? (
        <div className="flex min-h-11 items-center justify-between">
          <GopurLogo />
          <Link to="/settings" className="flex size-11 items-center justify-center rounded-full" aria-label={m.settings_title()}>
            <GearIcon className="size-6" />
          </Link>
        </div>
      ) : null}
      {props.mode === "explore" ? (
        <h1 className="m-0 truncate text-lg font-bold tracking-tight">{props.title}</h1>
      ) : null}
      {props.mode === "primary" ? (
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <span />
          <h1 className="m-0 truncate text-center text-lg font-bold tracking-tight md:text-left">{props.title}</h1>
          <Link
            to="/settings"
            className="flex size-11 items-center justify-center rounded-full md:hidden"
            aria-label={m.settings_title()}
          >
            <GearIcon className="size-6" />
          </Link>
        </div>
      ) : null}
      {props.mode === "detail" ? (
        <div className="flex min-h-11 items-center gap-2">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full"
            aria-label={m.common_back()}
            onClick={() => (history.length > 1 ? history.back() : void navigate({ to: "/" }))}
          >
            <ArrowLeftIcon className="size-6" />
          </button>
          <h1 className="m-0 truncate text-lg font-bold tracking-tight">{props.title}</h1>
        </div>
      ) : null}
    </header>
  );
}
