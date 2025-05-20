"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mic, Bot, History, User, ChevronLeft, ChevronRight, CreditCard, Settings, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    name: "Voice Chat",
    href: "/",
    icon: Mic
  },
  {
    name: "AI Assistants",
    href: "/assistants",
    icon: Bot
  },
  {
    name: "History",
    href: "/history",
    icon: History
  },
  {
    name: "Usage",
    href: "/usage",
    icon: BarChart
  },
  {
    name: "Billing",
    href: "/billing",
    icon: CreditCard
  },
  {
    name: "API Settings",
    href: "/api-settings",
    icon: Settings
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User
  }
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-screen bg-background border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <span className="font-bold text-lg">Audra</span>
        )}
        <button
          className="p-1 rounded hover:bg-muted transition ml-auto"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex-1 flex flex-col gap-1 mt-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-4 px-4 py-2 rounded transition-colors hover:bg-muted text-muted-foreground hover:text-primary",
                active && "bg-muted text-primary font-semibold"
              )}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span className="text-base">{link.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
} 