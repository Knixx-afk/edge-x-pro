"use client";

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/solid";

type ScoreCardProps = {
  title: string;
  score: number;
  description?: string;
};

export default function ScoreCard({
  title,
  score,
  description,
}: ScoreCardProps) {

  const getColor = () => {
    if (score >= 90)
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
      };

    if (score >= 75)
      return {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
      };

    if (score >= 50)
      return {
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        text: "text-orange-400",
      };

    return {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
    };
  };

  const color = getColor();

  return (
    <div
      className={`rounded-2xl border ${color.border} ${color.bg} p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}
    >
      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs uppercase tracking-widest text-slate-400">
            {title}
          </p>

          <h2 className={`mt-3 text-4xl font-black ${color.text}`}>
            {score}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {description ?? "Performance Score"}
          </p>

        </div>

        <div>

          {score >= 75 ? (
            <ArrowTrendingUpIcon
              className={`h-10 w-10 ${color.text}`}
            />
          ) : (
            <ArrowTrendingDownIcon
              className={`h-10 w-10 ${color.text}`}
            />
          )}

        </div>

      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">

        <div
          className={`h-full rounded-full ${
            score >= 90
              ? "bg-emerald-500"
              : score >= 75
              ? "bg-yellow-400"
              : score >= 50
              ? "bg-orange-400"
              : "bg-red-500"
          }`}
          style={{
            width: `${score}%`,
            transition: "width 1s ease",
          }}
        />

      </div>

    </div>
  );
}