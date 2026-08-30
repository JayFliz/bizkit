"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function ContactsSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.replace(`/crm/contacts${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="relative">
      <input
        type="search"
        name="q"
        placeholder="Search contacts by name or email..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
        </div>
      )}
    </div>
  );
}
