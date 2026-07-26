"use client";

type Props = {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
};

export default function AiCoach({
  strengths,
  weaknesses,
  recommendations,
  score,
}: Props) {
  const coachMessage = () => {
    if (score >= 90) {
      return {
        title: "Elite Performance",
        message:
          "Excellent work. Your execution matched your trading plan. Focus on repeating this process consistently instead of searching for perfection.",
      };
    }

    if (score >= 80) {
      return {
        title: "Very Good Trade",
        message:
          "A strong trade overall. Small improvements in discipline and execution can move you into elite territory.",
      };
    }

    if (score >= 65) {
      return {
        title: "Needs Improvement",
        message:
          "Your strategy may be good, but execution needs work. Eliminate emotional decisions and follow your checklist before entering.",
      };
    }

    return {
      title: "Trading Warning",
      message:
        "Your biggest enemy is not the market—it's inconsistency. Stop trading for today, review this trade, and return only when you can follow your plan.",
    };
  };

  const coach = coachMessage();

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 shadow-lg">

      <div className="flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-2xl">
          🤖
        </div>

        <div>

          <h2 className="text-xl font-bold text-cyan-400">
            AI Trading Coach
          </h2>

          <p className="text-sm text-slate-400">
            Personalized coaching based on this trade
          </p>

        </div>

      </div>

      <div className="mt-6 rounded-xl bg-slate-950 p-5">

        <h3 className="text-lg font-bold text-cyan-300">
          {coach.title}
        </h3>

        <p className="mt-3 leading-7 text-slate-300">
          {coach.message}
        </p>

      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">

        <div className="rounded-xl bg-slate-950 p-4">

          <h3 className="font-semibold text-emerald-400">
            ✅ Best Habit
          </h3>

          <p className="mt-3 text-sm text-slate-300">
            {strengths.length > 0
              ? strengths[0]
              : "Continue following your trading plan."}
          </p>

        </div>

        <div className="rounded-xl bg-slate-950 p-4">

          <h3 className="font-semibold text-red-400">
            ⚠ Biggest Mistake
          </h3>

          <p className="mt-3 text-sm text-slate-300">
            {weaknesses.length > 0
              ? weaknesses[0]
              : "No major mistakes detected."}
          </p>

        </div>

        <div className="rounded-xl bg-slate-950 p-4">

          <h3 className="font-semibold text-yellow-400">
            🎯 Next Goal
          </h3>

          <p className="mt-3 text-sm text-slate-300">
            {recommendations.length > 0
              ? recommendations[0]
              : "Maintain consistency and continue journaling."}
          </p>

        </div>

      </div>

      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <h3 className="font-bold text-cyan-400">
          AI Coach Tip
        </h3>

        <p className="mt-3 leading-7 text-slate-300">
          Professional traders focus on executing their edge consistently—not
          on whether any single trade wins or loses. Judge yourself by the
          quality of your decisions, not just the outcome.
        </p>

      </div>

    </div>
  );
}