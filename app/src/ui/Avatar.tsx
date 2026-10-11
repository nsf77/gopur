import { Avatar as KumoAvatar } from "@cloudflare/kumo/primitives/avatar";
import { cn } from "@cloudflare/kumo/utils";
import { organizerColorFromName, organizerInitial } from "../lib/avatar";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
} as const;

export function Avatar(props: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const size = props.size ?? "md";
  return (
    <KumoAvatar.Root className={cn("inline-flex shrink-0 overflow-hidden rounded-full", sizes[size], props.className)}>
      {props.src ? <KumoAvatar.Image src={props.src} alt="" className="size-full object-cover" /> : null}
      <KumoAvatar.Fallback
        className="flex size-full items-center justify-center font-bold text-white"
        style={{ backgroundColor: organizerColorFromName(props.name) }}
      >
        {organizerInitial(props.name)}
      </KumoAvatar.Fallback>
    </KumoAvatar.Root>
  );
}
