import { organizerColorFromName, organizerInitial } from "../lib/avatar";
import { avatar } from "./styles";

export function Avatar(props: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span className={avatar({ size: props.size, class: props.className })}>
      {props.src ? (
        <img src={props.src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span
          className="flex size-full items-center justify-center font-bold text-white"
          style={{ backgroundColor: organizerColorFromName(props.name) }}
          aria-hidden="true"
        >
          {organizerInitial(props.name)}
        </span>
      )}
    </span>
  );
}
