"use client";

import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

type Props = {
  score: number;
};

export default function AiVerdict({
  score,
}: Props) {

  let title = "";
  let message = "";
  let color = "";
  let bg = "";
  let border = "";
  let Icon = InformationCircleIcon;

  if (score >= 90) {
    title = "Excellent Trade";
    message =
      "Your execution was highly disciplined. Keep repeating this process.";

    color = "text-emerald-400";
    bg = "bg-emerald-500/10";
    border = "border-emerald-500/30";
    Icon = CheckBadgeIcon;
  }

  else if (score >= 80) {
    title = "Good Trade";
    message =
      "A solid trade with only minor improvements needed.";

    color = "text-yellow-400";
    bg = "bg-yellow-500/10";
    border = "border-yellow-500/30";
    Icon = InformationCircleIcon;
  }

  else if (score >= 65) {
    title = "Average Trade";
    message =
      "Several mistakes reduced the quality. Focus on discipline.";

    color = "text-orange-400";
    bg = "bg-orange-500/10";
    border = "border-orange-500/30";
    Icon = ExclamationTriangleIcon;
  }

  else {
    title = "Poor Trade";
    message =
      "The trade broke important rules. Review before taking another setup.";

    color = "text-red-400";
    bg = "bg-red-500/10";
    border = "border-red-500/30";
    Icon = XCircleIcon;
  }

  return (

    <div
      className={`rounded-2xl border ${border} ${bg} p-6`}
    >

      <div className="flex items-start gap-4">

        <Icon
          className={`h-12 w-12 ${color}`}
        />

        <div>

          <h2
            className={`text-2xl font-bold ${color}`}
          >
            {title}
          </h2>

          <p className="mt-2 text-slate-300 leading-7">
            {message}
          </p>

        </div>

      </div>

    </div>

  );

}