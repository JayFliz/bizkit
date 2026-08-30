"use client";

import { updateTicketStatus, assignTicket } from "@/actions/support";

export function TicketActions({
  ticketId,
  status,
  assignedTo,
  allUsers,
}: {
  ticketId: number;
  status: string;
  assignedTo: number | null;
  allUsers: { id: number; name: string }[];
}) {
  const canProgress = status !== "closed";
  const nextStatus =
    status === "open"
      ? "in_progress"
      : status === "in_progress"
        ? "closed"
        : null;

  const nextLabel =
    status === "open"
      ? "Start Progress"
      : status === "in_progress"
        ? "Close Ticket"
        : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
        Actions
      </h2>

      <div className="flex flex-wrap items-end gap-4">
        {/* Status transition */}
        {canProgress && nextStatus && (
          <button
            onClick={() => updateTicketStatus(ticketId, nextStatus)}
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            {nextLabel}
          </button>
        )}

        {/* Assign dropdown */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Assign To
          </label>
          <select
            value={assignedTo ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                assignTicket(ticketId, Number(val));
              }
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Unassigned</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
