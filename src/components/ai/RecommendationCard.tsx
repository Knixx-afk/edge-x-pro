"use client";

import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/solid";

type Props = {
  recommendations: string[];
};

export default function RecommendationCard({
  recommendations,
}: Props) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-slate-900 p-6">

      <div className="flex items-center gap-3">

        <LightBulbIcon className="h-8 w-8 text-yellow-400" />

        <div>

          <h2 className="text-xl font-bold text-yellow-400">
            AI Recommendations
          </h2>

          <p className="text-sm text-slate-400">
            Actionable improvements for your next trade
          </p>

        </div>

      </div>

      {recommendations.length === 0 ? (

        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">

          <div className="flex items-center gap-3">

            <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-400" />

            <div>

              <h3 className="font-semibold text-emerald-400">
                Excellent Performance
              </h3>

              <p className="mt-1 text-sm text-slate-300">
                No major recommendations. Continue following
                your trading plan and stay disciplined.
              </p>

            </div>

          </div>

        </div>

      ) : (

        <div className="mt-6 space-y-4">

          {recommendations.map((item, index) => (

            <div
              key={index}
              className="flex items-start gap-4 rounded-xl bg-slate-950 p-4 transition hover:bg-slate-800"
            >

              <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-bold text-yellow-400">
                {index + 1}
              </div>

              <div>

                <h4 className="font-semibold text-white">
                  Recommendation {index + 1}
                </h4>

                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {item}
                </p>

              </div>

            </div>

          ))}

        </div>

      )}

      <div className="mt-8 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <h3 className="font-semibold text-cyan-400">
          AI Insight
        </h3>

        <p className="mt-3 leading-7 text-slate-300">
          Focus on improving one habit at a time. Consistently
          fixing your biggest weakness often has a greater impact
          than trying to improve everything simultaneously.
        </p>

      </div>

    </div>
  );
}