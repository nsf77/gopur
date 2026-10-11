import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { m } from "../paraglide/messages.js";
import { Button } from "../ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  return (
    <main className="grid gap-4 p-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.auth_welcome()}</h1>
      <p className="m-0 text-sm text-text-muted">{m.auth_subtitle()}</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({ to: "/login/verify", search: { email } });
        }}
      >
        <label className="grid gap-1 text-sm font-medium">
          {m.auth_emailLabel()}
          <input
            type="email"
            required
            className="min-h-11 rounded-md border border-divider bg-surface px-3"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
        </label>
        <Button type="submit">{m.auth_sendCode()}</Button>
      </form>
    </main>
  );
}
