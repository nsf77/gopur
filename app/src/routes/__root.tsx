import { type ReactNode, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { LinkProvider } from "@cloudflare/kumo/utils";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { queryClient } from "../lib/query";
import { initTheme } from "../lib/theme";
import { AppShell } from "../shell/AppShell";
import { AppLink } from "../ui/kumo-link";
import appCss from "../index.css?url";

const themeBoot = `(function () {
  try {
    var pref = localStorage.getItem("gopur.theme") || "system";
    var dark = pref === "dark" || (pref !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-mode", dark ? "dark" : "light");
  } catch (e) {}
})();`;

export const Route = createRootRoute({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
      { name: "theme-color", content: "#304385" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "Gopur" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon-180.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [{ children: themeBoot }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    initTheme();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <LinkProvider component={AppLink}>
        <NuqsAdapter>
          <AppShell>
            <Outlet />
          </AppShell>
        </NuqsAdapter>
      </LinkProvider>
    </QueryClientProvider>
  );
}
