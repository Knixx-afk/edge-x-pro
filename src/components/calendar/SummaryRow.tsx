type Props = {
  label: string;
  value: string;
  valueClass?: string;
};

export default function SummaryRow({
  label,
  value,
  valueClass = "text-white",
}: Props) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 py-3 last:border-b-0">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span
        className={`font-semibold ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}