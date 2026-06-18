"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";

const TABS: {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
}[] = [
  {
    href: appRouter.dashboard,
    label: "My week",
    match: (p) => p === "/d" || p === "/d/" || p.startsWith("/d/channels"),
  },
  {
    href: appRouter.explore,
    label: "Create",
    match: (p) => p.startsWith("/explore"),
  },
  {
    href: appRouter.results,
    label: "Results",
    match: (p) => p.startsWith("/d/results"),
  },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center">
      <nav className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] p-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
