"use client";

export default function Header() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-3xl font-bold text-white">
          Dashboard
        </h2>

        <p className="text-gray-400">
          Welcome back, Kanishak
        </p>
      </div>

      <div className="bg-slate-800 px-4 py-2 rounded-xl">
        🟢 Market Open
      </div>
    </header>
  );
}