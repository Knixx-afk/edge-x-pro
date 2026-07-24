"use client";

type Props = {
  title: string;
  value: string;
};

export default function StatCard({ title, value }: Props) {
  return (
    <div className="bg-slate-900 rounded-xl p-6">
      <p className="text-gray-400">{title}</p>

      <h2 className="text-4xl font-bold mt-2 text-white">
        {value}
      </h2>
    </div>
  );
}