type Props = {
  title: string;
  value: string;
  valueClass?: string;
};

export default function StatCard({
  title,
  value,
  valueClass = "text-white",
}: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}