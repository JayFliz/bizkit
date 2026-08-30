"use client";

import { useState, useTransition } from "react";
import { moveOpportunity } from "@/actions/crm";
import { formatCurrency } from "@/lib/utils";

type OpportunityCard = {
  id: number;
  name: string;
  stage: string;
  value: number | null;
  companyName: string | null;
};

type Column = {
  stage: string;
  items: OpportunityCard[];
};

const STAGE_LABELS: Record<string, string> = {
  identified: "Identified",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  identified: "bg-zinc-400",
  qualified: "bg-sky-500",
  proposal: "bg-indigo-500",
  negotiation: "bg-amber-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

export function PipelineBoard({
  columns: initialColumns,
}: {
  columns: Column[];
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [draggedItem, setDraggedItem] = useState<OpportunityCard | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDragStart(item: OpportunityCard) {
    setDraggedItem(item);
  }

  function handleDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault();
    setDragOverStage(stage);
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  function handleDrop(e: React.DragEvent, targetStage: string) {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedItem || draggedItem.stage === targetStage) {
      setDraggedItem(null);
      return;
    }

    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => {
        if (col.stage === draggedItem.stage) {
          return {
            ...col,
            items: col.items.filter((i) => i.id !== draggedItem.id),
          };
        }
        if (col.stage === targetStage) {
          return {
            ...col,
            items: [
              ...col.items,
              { ...draggedItem, stage: targetStage },
            ],
          };
        }
        return col;
      })
    );

    startTransition(async () => {
      await moveOpportunity(draggedItem.id, targetStage);
    });

    setDraggedItem(null);
  }

  function handleDragEnd() {
    setDraggedItem(null);
    setDragOverStage(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.stage}
          className={`w-64 shrink-0 rounded-xl border bg-zinc-50 dark:bg-zinc-900 ${
            dragOverStage === col.stage
              ? "border-indigo-400 dark:border-indigo-500"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
          onDragOver={(e) => handleDragOver(e, col.stage)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.stage)}
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <div
              className={`h-2 w-2 rounded-full ${STAGE_COLORS[col.stage]}`}
            />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {STAGE_LABELS[col.stage]}
            </h3>
            <span className="ml-auto text-xs text-zinc-500">
              {col.items.length}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-2 p-2" style={{ minHeight: "6rem" }}>
            {col.items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragEnd={handleDragEnd}
                className={`cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-opacity active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-950 ${
                  draggedItem?.id === item.id ? "opacity-50" : ""
                }`}
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatCurrency(item.value ?? 0)}
                </p>
                {item.companyName && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {item.companyName}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
