"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

type Props = {
  strengths: string[];
  weaknesses: string[];
};

export default function StrengthWeaknessCard({
  strengths,
  weaknesses,
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">

      {/* Strengths */}

      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900 p-6">

        <div className="flex items-center gap-3">

          <CheckCircleIcon className="h-8 w-8 text-emerald-400" />

          <h2 className="text-xl font-bold text-emerald-400">
            Strengths
          </h2>

        </div>

        {strengths.length === 0 ? (

          <div className="mt-5 rounded-xl bg-slate-950 p-4 text-slate-500">
            No strengths detected.
          </div>

        ) : (

          <div className="mt-5 space-y-3">

            {strengths.map((item, index) => (

              <div
                key={index}
                className="flex items-start gap-3 rounded-xl bg-slate-950 p-4"
              >

                <CheckCircleIcon className="mt-0.5 h-5 w-5 text-emerald-400" />

                <p className="text-slate-300">
                  {item}
                </p>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* Weaknesses */}

      <div className="rounded-2xl border border-red-500/20 bg-slate-900 p-6">

        <div className="flex items-center gap-3">

          <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />

          <h2 className="text-xl font-bold text-red-400">
            Weaknesses
          </h2>

        </div>

        {weaknesses.length === 0 ? (

          <div className="mt-5 rounded-xl bg-slate-950 p-4 text-slate-500">
            No weaknesses detected.
          </div>

        ) : (

          <div className="mt-5 space-y-3">

            {weaknesses.map((item, index) => (

              <div
                key={index}
                className="flex items-start gap-3 rounded-xl bg-slate-950 p-4"
              >

                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-red-400" />

                <p className="text-slate-300">
                  {item}
                </p>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}