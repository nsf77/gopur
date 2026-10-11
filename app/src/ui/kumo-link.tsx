import { forwardRef } from "react";
import { Link as RouterLink } from "@tanstack/react-router";
import type { LinkComponentProps } from "@cloudflare/kumo/utils";

export const AppLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(function AppLink(
  { href, ...rest },
  ref,
) {
  if (!href || /^(https?:|mailto:|tel:)/.test(href)) {
    return <a ref={ref} href={href} {...rest} />;
  }
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const qIndex = withoutHash.indexOf("?");
  const pathname = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const search =
    qIndex >= 0 ? Object.fromEntries(new URLSearchParams(withoutHash.slice(qIndex + 1))) : undefined;
  return (
    <RouterLink
      ref={ref}
      to={pathname}
      search={search}
      hash={hash ? hash.slice(1) : undefined}
      {...rest}
    />
  );
});
