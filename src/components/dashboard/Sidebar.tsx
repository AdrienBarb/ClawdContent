"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { useSession, signOut } from "@/lib/better-auth/auth-client";
import { getPlatform } from "@/lib/constants/platforms";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import AddAccountModal from "@/components/dashboard/AddAccountModal";
import {
  CreditCardIcon,
  SignOutIcon,
  ListIcon,
  CaretUpDownIcon,
  PlusIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
  analysisStatus?: string | null;
}

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

function BrandMark() {
  return (
    <Image
      src="/logo.svg"
      alt="PostClaw"
      width={28}
      height={28}
      priority
      className="h-7 w-7 shrink-0 rounded-lg"
    />
  );
}

function StatusDot({
  status,
  analysisStatus,
}: {
  status: string;
  analysisStatus?: string | null;
}) {
  if (status !== "active") {
    return (
      <span
        aria-label="disconnected"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
      />
    );
  }
  if (analysisStatus === "analyzing" || analysisStatus === "pending") {
    return (
      <span
        aria-label="analyzing"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse"
      />
    );
  }
  return (
    <span
      aria-label="connected"
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
    />
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: status, refetch } = useDashboardStatus();
  const [addOpen, setAddOpen] = useState(false);

  const accounts: AccountInfo[] = (status?.accounts ?? []) as AccountInfo[];
  const activeAccounts = accounts.filter((a) => a.status === "active");

  // Count accounts per platform so we know when to add ?accountId=
  const platformCount = activeAccounts.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.platform] = (acc[a.platform] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const connectedPlatforms = Array.from(
    new Set(activeAccounts.map((a) => a.platform))
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleAccountConnected = () => {
    setAddOpen(false);
    refetch();
  };

  const buildAccountHref = (account: AccountInfo) => {
    const base = `/d/${account.platform}`;
    return platformCount[account.platform] > 1
      ? `${base}?accountId=${account.id}`
      : base;
  };

  const isAccountActive = (account: AccountInfo) => {
    if (!pathname.startsWith(`/d/${account.platform}`)) return false;
    if (platformCount[account.platform] === 1) return true;
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("accountId") === account.id;
  };

  return (
    <div className="flex h-full flex-col gap-4 px-3 py-4 bg-[#efedea] border-r border-gray-200/80">
      {/* Brand */}
      <Link
        href={appRouter.dashboard}
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-1.5 pt-1 pb-1 -tracking-[0.01em]"
      >
        <BrandMark />
        <span className="text-[16px] font-bold text-gray-900">PostClaw</span>
      </Link>

      {/* Accounts section — primary nav */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Accounts
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {activeAccounts.map((account) => {
            const platform = getPlatform(account.platform);
            const isActive = isAccountActive(account);
            const color = platform?.color ?? "#666";
            return (
              <Link
                key={account.id}
                href={buildAccountHref(account)}
                onClick={onNavigate}
                className={`group relative flex items-center gap-2.5 rounded-lg pl-1.5 pr-2 py-1.5 text-left transition-colors ${
                  isActive ? "bg-white shadow-sm" : "hover:bg-black/[0.035]"
                }`}
              >
                <span
                  className="self-stretch w-[3px] rounded-sm shrink-0"
                  style={{ backgroundColor: color, opacity: 0.9 }}
                />
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-[7px] text-white shrink-0"
                  style={{
                    backgroundColor: color,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  {platform?.icon}
                </span>
                <span className="flex flex-col leading-tight min-w-0 flex-1">
                  <span className="truncate text-[13px] font-medium text-gray-900">
                    {account.username}
                  </span>
                  <span className="truncate text-[11px] text-gray-500">
                    {platform?.label ?? account.platform}
                  </span>
                </span>
                <StatusDot
                  status={account.status}
                  analysisStatus={account.analysisStatus ?? undefined}
                />
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="group flex items-center gap-2.5 rounded-lg pl-1.5 pr-2 py-1.5 text-left transition-colors hover:bg-black/[0.035] cursor-pointer"
          >
            <span className="self-stretch w-[3px] rounded-sm bg-black/[0.08] shrink-0" />
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-dashed border-gray-300 text-gray-400 shrink-0">
              <PlusIcon className="h-3 w-3" />
            </span>
            <span className="text-[13px] text-gray-500">Add account</span>
          </button>
        </div>
      </div>

      {/* Footer: user dropdown */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200/80">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg bg-white px-2 py-1.5 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[11px] font-semibold shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6b7280, #374151)",
                }}
              >
                {getInitials(session?.user?.name, session?.user?.email)}
              </span>
              <div className="flex-1 min-w-0 text-left leading-tight">
                <p className="truncate text-[12px] font-medium text-gray-900">
                  {session?.user?.name || "User"}
                </p>
                <p className="truncate text-[11px] text-gray-500">
                  {session?.user?.email}
                </p>
              </div>
              <CaretUpDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56"
            sideOffset={4}
          >
            <DropdownMenuItem asChild>
              <Link href={appRouter.business} onClick={onNavigate}>
                <UserCircleIcon className="h-4 w-4" />
                Business
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={appRouter.billing} onClick={onNavigate}>
                <CreditCardIcon className="h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <SignOutIcon className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddAccountModal
        open={addOpen}
        onOpenChange={setAddOpen}
        connectedPlatforms={connectedPlatforms}
        onAccountConnected={handleAccountConnected}
      />
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
