import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LinkProps } from "@tanstack/react-router";
import { Button as KumoButton, LinkButton } from "@cloudflare/kumo/components/button";
import { cn } from "@cloudflare/kumo/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  width,
  className,
  children,
  to,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  width?: "auto" | "grow" | "full";
  children: ReactNode;
  to?: LinkProps["to"];
  loading?: boolean;
}) {
  const cls = cn(width === "full" && "w-full", width === "grow" && "flex-1", className);
  if (to) {
    return (
      <LinkButton href={typeof to === "string" ? to : String(to)} variant={variant} className={cls}>
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
