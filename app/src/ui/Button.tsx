import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { button, type ButtonVariants } from "./styles";

export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;

export function Button({
  variant,
  className,
  children,
  to,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
  to?: LinkProps["to"];
}) {
  const cls = button({ variant, class: className });
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
