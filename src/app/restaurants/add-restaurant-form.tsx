"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui";
import { addRestaurant, type AddRestaurantState } from "./actions";

/** Thêm một quán nhanh (tên + thành phố). Muốn thêm nhiều quán thì dùng Import CSV. */
export function AddRestaurantForm() {
  const [state, action, pending] = useActionState<AddRestaurantState, FormData>(addRestaurant, {});
  return (
    <form action={action} className="rounded-2xl border border-neutral-200 bg-white p-4" aria-label="Add a restaurant">
      <p className="text-sm font-semibold">Add a restaurant</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="new-name">
          Restaurant name
        </label>
        <input id="new-name" name="name" required minLength={2} maxLength={80} placeholder="Restaurant name" className={`${inputClass} sm:flex-[2]`} />
        <label className="sr-only" htmlFor="new-city">
          City
        </label>
        <input id="new-city" name="city" maxLength={60} placeholder="City (optional)" className={`${inputClass} sm:flex-1`} />
        <label className="sr-only" htmlFor="new-state">
          State
        </label>
        <input id="new-state" name="region" maxLength={40} placeholder="State" className={`${inputClass} sm:w-24`} />
        <button type="submit" disabled={pending} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
