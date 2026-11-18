"use client";

import { useActionState } from "react";
import { requestLoginLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestLoginLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-neutral-600">
          We sent a sign-in link to <strong className="text-neutral-900">{state.email}</strong>. It
          works once and expires in 15 minutes.
        </p>
        {state.devLink && (
          <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-medium text-amber-900">Local development: email is not sent yet.</p>
            <a href={state.devLink} className="font-semibold text-brand underline" data-testid="dev-login-link">
              Open sign-in link →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.status === "error" ? state.email : ""}
          placeholder="you@restaurant.com"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="text-center text-xs text-neutral-500">No password needed. New here? The link creates your account.</p>
    </form>
  );
}
