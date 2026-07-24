"use client";

type Props = {
  image: string | null;
  onClose: () => void;
};

export default function ChartModal({
  image,
  onClose,
}: Props) {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-lg bg-slate-800 px-4 py-2 text-white"
      >
        ✕ Close
      </button>

      <img
        src={image}
        alt="Trade Chart"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
      />
    </div>
  );
}