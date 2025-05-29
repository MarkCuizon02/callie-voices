"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mic, Bot, History, User, ChevronLeft, ChevronRight, CreditCard, Settings, BarChart, Moon, Volume2, Music2, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const playgroundLinks = [
  {
    name: "Home",
    href: "/",
    icon: Home
  },
  {
    name: "Text to Speech",
    href: "/text-to-speech",
    icon: Mic
  },
  {
    name: "Voice Changer",
    href: "/voice-changer",
    icon: Volume2
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <aside
      className={cn(
        "min-h-screen bg-background border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b gap-2">
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
        {/* Playground section */}
        {!collapsed && <div className="px-4 py-2 text-xs font-semibold text-muted-foreground select-none">Playground</div>}
        <div className="flex flex-col gap-1">
          {playgroundLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 pl-8 pr-4 py-2 rounded transition-colors hover:bg-muted text-muted-foreground hover:text-primary text-sm",
                  collapsed && "justify-center pl-0 pr-0",
                  active && "bg-muted text-primary font-semibold"
                )}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{link.name}</span>}
              </Link>
            );
          })}
        </div>
        {/* End Playground section */}
      </nav>
      {/* Bottom section: only show when expanded */}
      {!collapsed && (
        <div className="flex flex-col gap-0 mt-auto">
          <button
            className="flex items-center gap-4 px-4 py-2 rounded transition-colors hover:bg-muted text-muted-foreground hover:text-primary w-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Moon className="h-5 w-5" />
            <span className="text-base">Themes</span>
          </button>
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-muted">
            Quota remaining: 1000
          </div>
        </div>
      )}
    </aside>
  );
} 