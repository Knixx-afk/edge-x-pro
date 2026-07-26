"use client";

import {
  LayoutDashboard,
  Brain,
  Calendar,
  Database,
  BarChart3,
  Settings,
  CandlestickChart,
  Bell,
  LucideIcon,
} from "lucide-react";

type SidebarItem = {
  name: string;
  icon: LucideIcon;
};

const items: SidebarItem[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Live Intelligence", icon: Brain },
  { name: "FOMC", icon: Calendar },
  { name: "Core CPI", icon: Bell },
  { name: "NFP", icon: CandlestickChart },
  { name: "Historical", icon: Database },
  { name: "Pattern AI", icon: BarChart3 },
  { name: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-72 h-screen bg-[#101722] border-r border-[#1f2937]">
      <div className="p-8 text-3xl font-bold text-[#E8B54A]">
        EDGE X PRO
      </div>

      <div className="space-y-2 px-4">
        {items.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition hover:bg-[#182333]"
          >
            <Icon size={20} />
            <span>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}