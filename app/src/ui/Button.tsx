import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LinkProps } from "@tanstack/react-router";
import { Button as KumoButton, LinkButton } from "@cloudflare/kumo/components/button";
import { cn } from "@cloudflare/kumo/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

function hrefFromRoute(to: LinkProps["to"], search?: LinkProps["search"]): string {
  const path = typeof to === "string" ? to : String(to);
  if (!search || typeof search !== "object") return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search as Record<string, unknown>)) {
    if (value == null || value === false) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function Button({
  variant = "primary",
  width,
  className,
  children,
  to,
  search,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  width?: "auto" | "grow" | "full";
  children: ReactNode;
  to?: LinkProps["to"];
  search?: LinkProps["search"];
  loading?: boolean;
}) {
  const cls = cn(width === "full" && "w-full", width === "grow" && "flex-1", className);
  if (to) {
    return (
      <LinkButton href={hrefFromRoute(to, search)} variant={variant} className={cls}>
        {children}
      </LinkButton>
    );
  }
  return (
    <KumoButton variant={variant} className={cls} {...props}>
      {children}
    </KumoButton>
  );
}
