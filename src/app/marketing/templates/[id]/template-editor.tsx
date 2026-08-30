"use client";

import { useState, useTransition } from "react";
import { updateTemplate } from "@/actions/marketing";

type Block = {
  type: "heading" | "text" | "button" | "image" | "divider";
  content?: string;
  url?: string;
  alt?: string;
};

export function TemplateEditor({
  templateId,
  initialName,
  initialSubject,
  initialBlocks,
}: {
  templateId: number;
  initialName: string;
  initialSubject: string;
  initialBlocks: Block[];
}) {
  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function addBlock(type: Block["type"]) {
    const newBlock: Block = { type };
    switch (type) {
      case "heading":
        newBlock.content = "New Heading";
        break;
      case "text":
        newBlock.content = "New paragraph text...";
        break;
      case "button":
        newBlock.content = "Click Here";
        newBlock.url = "https://example.com";
        break;
      case "image":
        newBlock.url = "https://via.placeholder.com/600x200";
        newBlock.alt = "Image description";
        break;
      case "divider":
        break;
    }
    setBlocks([...blocks, newBlock]);
  }

  function updateBlock(index: number, updates: Partial<Block>) {
    setBlocks(blocks.map((b, i) => (i === index ? { ...b, ...updates } : b)));
  }

  function removeBlock(index: number) {
    setBlocks(blocks.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateTemplate(templateId, {
        name,
        subject,
        content: JSON.stringify(blocks),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor pane */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Blocks
            </h2>
            <AddBlockDropdown onAdd={addBlock} />
          </div>
          <div className="space-y-2">
            {blocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No blocks yet. Add a block to start building your email.
                </p>
              </div>
            ) : (
              blocks.map((block, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {block.type}
                    </span>
                    <button
                      onClick={() => removeBlock(i)}
                      className="text-xs text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                  <BlockEditor
                    block={block}
                    isEditing={editingIndex === i}
                    onStartEdit={() => setEditingIndex(i)}
                    onStopEdit={() => setEditingIndex(null)}
                    onChange={(updates) => updateBlock(i, updates)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview pane */}
        <div>
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Preview
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Subject: {subject || "(no subject)"}
              </p>
            </div>
            <div className="p-6 space-y-4 max-w-[600px] mx-auto">
              {blocks.map((block, i) => (
                <PreviewBlock key={i} block={block} />
              ))}
              {blocks.length === 0 && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
                  Email preview will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  isEditing,
  onStartEdit,
  onStopEdit,
  onChange,
}: {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (updates: Partial<Block>) => void;
}) {
  if (block.type === "divider") {
    return <hr className="border-zinc-200 dark:border-zinc-700" />;
  }

  if (block.type === "image") {
    return (
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            Image URL
          </label>
          <input
            type="text"
            value={block.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            Alt Text
          </label>
          <input
            type="text"
            value={block.alt ?? ""}
            onChange={(e) => onChange({ alt: e.target.value })}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    return (
      <div className="space-y-2">
        {isEditing ? (
          <>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={block.content ?? ""}
                onChange={(e) => onChange({ content: e.target.value })}
                onBlur={onStopEdit}
                autoFocus
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                URL
              </label>
              <input
                type="text"
                value={block.url ?? ""}
                onChange={(e) => onChange({ url: e.target.value })}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </>
        ) : (
          <div
            onClick={onStartEdit}
            className="cursor-pointer rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium text-center inline-block"
          >
            {block.content || "Button"}
          </div>
        )}
      </div>
    );
  }

  // heading / text
  if (isEditing) {
    return block.type === "heading" ? (
      <input
        type="text"
        value={block.content ?? ""}
        onChange={(e) => onChange({ content: e.target.value })}
        onBlur={onStopEdit}
        autoFocus
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-lg font-bold dark:border-zinc-700 dark:bg-zinc-800"
      />
    ) : (
      <textarea
        value={block.content ?? ""}
        onChange={(e) => onChange({ content: e.target.value })}
        onBlur={onStopEdit}
        autoFocus
        rows={3}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 resize-y"
      />
    );
  }

  return (
    <div onClick={onStartEdit} className="cursor-pointer">
      {block.type === "heading" ? (
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {block.content || "Click to edit heading..."}
        </p>
      ) : (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
          {block.content || "Click to edit text..."}
        </p>
      )}
    </div>
  );
}

function PreviewBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {block.content}
        </h2>
      );
    case "text":
      return (
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
          {block.content}
        </p>
      );
    case "button":
      return (
        <div className="text-center">
          <span className="inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white">
            {block.content || "Button"}
          </span>
        </div>
      );
    case "image":
      return (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt ?? ""}
            className="max-w-full rounded-md"
          />
        </div>
      );
    case "divider":
      return <hr className="border-zinc-200 dark:border-zinc-700" />;
    default:
      return null;
  }
}

function AddBlockDropdown({ onAdd }: { onAdd: (type: Block["type"]) => void }) {
  const [open, setOpen] = useState(false);

  const types: { type: Block["type"]; label: string }[] = [
    { type: "heading", label: "Heading" },
    { type: "text", label: "Text" },
    { type: "button", label: "Button" },
    { type: "image", label: "Image" },
    { type: "divider", label: "Divider" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        Add Block
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 z-10">
          {types.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                onAdd(t.type);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
