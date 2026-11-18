"use client";

import { useActionState } from "react";
import { createRestaurant, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(createRestaurant, {});
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Restaurant name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          placeholder="e.g. Lantern & Ladle"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create my menu"}
      </button>
    </form>
  );
}
