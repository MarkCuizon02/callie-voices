"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Mic, Bot, History, User } from "lucide-react";

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
    name: "Profile",
    href: "/profile",
    icon: User
  }
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === link.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{link.name}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
