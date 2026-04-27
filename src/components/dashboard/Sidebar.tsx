"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import { useSession, signOut } from "@/lib/better-auth/auth-client";
import { getPlatform } from "@/lib/constants/platforms";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import {
  CreditCardIcon,
  GearSixIcon,
  SignOutIcon,
  ListIcon,
  CaretUpDownIcon,
  GiftIcon,
  PlusIcon,
  UserCircleIcon,
  PencilSimpleIcon,
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

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
}

const userMenuItems = [
  { href: appRouter.billing, label: "Billing", icon: CreditCardIcon },
  { href: appRouter.settings, label: "Settings", icon: GearSixIcon },
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
  const { data: status } = useDashboardStatus();

  const accounts: AccountInfo[] = (status?.accounts ?? []).filter(
    (a: AccountInfo) => a.status === "active"
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isDashboardActive = pathname === "/d" || pathname === "/d/";
  const isBusinessActive = pathname.startsWith(appRouter.business);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Link
          href={appRouter.dashboard}
          className="text-lg font-bold tracking-tight text-gray-900"
          onClick={onNavigate}
        >
          PostClaw
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="px-3 pb-1 space-y-0.5">
        <SidebarLink
          href={appRouter.dashboard}
          icon={PencilSimpleIcon}
          label="Create"
          isActive={isDashboardActive}
          onNavigate={onNavigate}
        />
        <SidebarLink
          href={appRouter.business}
          icon={UserCircleIcon}
          label="My Business"
          isActive={isBusinessActive}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Scrollable channels area */}
      <div className="flex-1 overflow-y-auto px-3 pt-4">
        {/* Connected channels */}
        <div className="px-2 mb-1 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            My accounts
          </p>
          <Link
            href={appRouter.accounts}
            onClick={onNavigate}
            title="Manage accounts"
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <GearSixIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-0.5">
          {accounts.map((account) => {
            const platform = getPlatform(account.platform);
            const isChannelActive = pathname === `/d/channels/${account.id}`;
            return (
              <Link
                key={account.id}
                href={`/d/channels/${account.id}`}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors ${
                  isChannelActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0"
                  style={{ backgroundColor: platform?.color ?? "#666" }}
                >
                  {platform?.icon}
                </span>
                <span className="truncate text-sm font-medium text-gray-800">
                  {account.username}
                </span>
              </Link>
            );
          })}
          <Link
            href={appRouter.accounts}
            onClick={onNavigate}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 shrink-0">
              <PlusIcon className="h-3 w-3 text-gray-400" />
            </span>
            <span className="text-sm font-medium">Add account</span>
          </Link>
        </div>
      </div>

      {/* Affiliates */}
      <div className="px-3 pb-2">
        <SidebarLink
          href={appRouter.affiliates}
          icon={GiftIcon}
          label="Affiliates"
          isActive={pathname.startsWith(appRouter.affiliates)}
          onNavigate={onNavigate}
        />
      </div>

      {/* User section */}
      <div className="border-t border-gray-200/60">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors cursor-pointer">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ background: "var(--sidebar-accent)" }}
                >
                  {getInitials(session?.user?.name, session?.user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate text-gray-900">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs truncate text-gray-500">
                  {session?.user?.email}
                </p>
              </div>
              <CaretUpDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
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

function SidebarLink({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  badge?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </Link>
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
      <SheetContent side="left" className="w-64 p-0 border-0 [&>button]:hidden">
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
