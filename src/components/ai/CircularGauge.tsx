"use client";

type CircularGaugeProps = {
  score: number;
  size?: number;
};

export default function CircularGauge({
  score,
  size = 220,
}: CircularGaugeProps) {
  const stroke = 14;

  const radius = (size - stroke) / 2;

  const circumference = 2 * Math.PI * radius;

  const progress =
    circumference - (score / 100) * circumference;

  const color =
    score >= 90
      ? "#10b981"
      : score >= 75
      ? "#facc15"
      : "#ef4444";

  return (
    <div className="flex flex-col items-center justify-center">

      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          style={{
            transition:
              "stroke-dashoffset 1s ease",
          }}
        />

      </svg>

      <div className="-mt-36 text-center">

        <div
          className="text-6xl font-black"
          style={{ color }}
        >
          {score}
        </div>

        <div className="mt-1 text-sm uppercase tracking-widest text-slate-400">
          EDGE SCORE
        </div>

      </div>

    </div>
  );
}