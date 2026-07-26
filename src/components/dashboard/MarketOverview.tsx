"use client";

const markets = [
  {
    name: "Gold",
    value: "$3432.21",
    change: "+0.82%",
    color: "text-yellow-400",
  },
  {
    name: "DXY",
    value: "98.21",
    change: "-0.41%",
    color: "text-red-400",
  },
  {
    name: "US10Y",
    value: "4.29%",
    change: "+0.10%",
    color: "text-blue-400",
  },
  {
    name: "VIX",
    value: "17.84",
    change: "-3.1%",
    color: "text-green-400",
  },
];

export default function MarketOverview() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

      <h2 className="mb-6 text-xl font-bold">
        Market Overview
      </h2>

      <div className="grid grid-cols-2 gap-4">

        {markets.map((market) => (
          <div
            key={market.name}
            className="rounded-xl bg-slate-950 border border-slate-800 p-5"
          >
            <div className="text-slate-400 text-sm">
              {market.name}
            </div>

            <div className="mt-3 text-2xl font-bold">
              {market.value}
            </div>

            <div className={`mt-2 ${market.color}`}>
              {market.change}
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}