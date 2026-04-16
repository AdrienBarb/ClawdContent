"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import { useSession, signOut } from "@/lib/better-auth/auth-client";
import {
  ShareNetworkIcon,
  RobotIcon,
  CreditCardIcon,
  CoinsIcon,
  GearSixIcon,
  SignOutIcon,
  ListIcon,
  UserCircleIcon,
  GiftIcon,
  CaretUpDownIcon,
  FileTextIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { href: appRouter.dashboard, label: "Chat", icon: RobotIcon },
  {
    href: appRouter.accounts,
    label: "Social Accounts",
    icon: ShareNetworkIcon,
  },
  { href: appRouter.posts, label: "Content", icon: FileTextIcon },
  { href: appRouter.context, label: "Knowledge", icon: UserCircleIcon },
];

const userMenuItems = [
  { href: appRouter.billing, label: "Billing", icon: CreditCardIcon },
  { href: appRouter.settings, label: "Settings", icon: GearSixIcon },
  { href: appRouter.credits, label: "Credits", icon: CoinsIcon },
];

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div
        className="flex h-16 items-center px-5 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Link
          href={appRouter.dashboard}
          className="text-lg font-bold tracking-tight text-white"
          onClick={onNavigate}
        >
          PostClaw
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p
          className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--sidebar-text)" }}
        >
          Menu
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/d"
              ? pathname === "/d"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: isActive ? "var(--sidebar-accent)" : "transparent",
                color: isActive ? "#ffffff" : "var(--sidebar-text)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--sidebar-bg-hover)";
                  e.currentTarget.style.color = "var(--sidebar-text-active)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sidebar-text)";
                }
              }}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Affiliates */}
      <div className="px-3 pb-3">
        <Link
          href={appRouter.affiliates}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
          style={{
            color: "var(--sidebar-text)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--sidebar-bg-hover)";
            e.currentTarget.style.color = "var(--sidebar-text-active)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--sidebar-text)";
          }}
        >
          <GiftIcon className="h-[18px] w-[18px] shrink-0" />
          Affiliates
        </Link>
      </div>

      {/* User section with dropdown */}
      <div
        className="border-t"
        style={{
          borderColor: "var(--sidebar-border)",
          background: "var(--sidebar-user-bg)",
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 p-4 cursor-pointer transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sidebar-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ background: "var(--sidebar-accent)" }}
                >
                  {getInitials(session?.user?.name, session?.user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate text-white">
                  {session?.user?.name || "User"}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {session?.user?.email}
                </p>
              </div>
              <CaretUpDownIcon
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--sidebar-text)" }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56"
            sideOffset={4}
          >
            {userMenuItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} onClick={onNavigate}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <SignOutIcon className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <ListIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 border-0 [&>button]:hidden"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40">
      <SidebarNav />
    </aside>
  );
}
