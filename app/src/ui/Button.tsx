import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { button, type ButtonVariants } from "./styles";

export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;

export function Button({
  variant,
  width,
  className,
  children,
  to,
  search,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  width?: ButtonVariants["width"];
  children: ReactNode;
  to?: LinkProps["to"];
  search?: LinkProps["search"];
}) {
  const cls = button({ variant, width, class: className });
  if (to) {
    return (
      <Link to={to} search={search} className={cls}>
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
