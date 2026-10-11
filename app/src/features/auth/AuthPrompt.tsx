import { m } from "../../paraglide/messages.js";
import { Button } from "../../ui/Button";

export function AuthPrompt(props: { next: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
      <p className="m-0 text-sm text-text-muted">{props.message}</p>
      <Button to="/login" search={{ next: props.next }} width="full" className="max-w-xs">
        {m.common_signIn()}
      </Button>
    </div>
  );
}
