export function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        {icon && (
          <svg
            className="h-5 w-5 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {change && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {change}
        </p>
      )}
    </div>
  );
}
