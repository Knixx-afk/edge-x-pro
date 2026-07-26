"use client";

type ProgressBarProps = {
  title: string;
  value: number;
  max?: number;
};

export default function ProgressBar({
  title,
  value,
  max = 100,
}: ProgressBarProps) {
  const percentage = Math.min(
    100,
    Math.max(0, (value / max) * 100)
  );

  const color =
    percentage >= 90
      ? "bg-emerald-500"
      : percentage >= 75
      ? "bg-yellow-400"
      : percentage >= 50
      ? "bg-orange-400"
      : "bg-red-500";

  return (
    <div className="space-y-2">

      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-slate-300">
          {title}
        </span>

        <span className="text-sm font-bold text-white">
          {value}/{max}
        </span>

      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">

        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}