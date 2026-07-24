"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  NotebookPen,
  BarChart3,
  LineChart,
  Sparkles,
  Newspaper,
  CalendarDays,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Journal",
    href: "/journal",
    icon: NotebookPen,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Charts",
    href: "/charts",
    icon: LineChart,
  },
  {
    name: "AI Review",
    href: "/ai-review",
    icon: Sparkles,
  },
  {
    name: "News Reactions",
    href: "/news-reactions",
    icon: Newspaper,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-slate-800 bg-[#111a2d]">
      {/* LOGO */}
      <div className="border-b border-slate-800 px-4 py-6">
        <h1 className="text-[28px] font-black tracking-tight text-yellow-400">
          EDGE X PRO
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Trading Performance Journal
        </p>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-5">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 rounded-xl px-4 py-3
                text-[16px] font-medium transition-all duration-200
                ${
                  active
                    ? "bg-yellow-400 text-black"
                    : "text-slate-200 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM STATUS */}
      <div className="p-3">
        <div className="rounded-xl bg-[#020617] p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

            <span className="text-xs font-semibold text-white">
              EDGE X PRO
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-500">
            trading edge, measured.
          </div>
        </div>
      </div>
    </aside>
  );
}