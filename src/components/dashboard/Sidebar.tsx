"use client";

import Image from "next/image";
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
import UsageMeter from "./UsageMeter";
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

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  ghost,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  ghost?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-white text-gray-900 shadow-sm"
          : ghost
            ? "text-gray-500 hover:text-gray-900 hover:bg-black/[0.04]"
            : "text-gray-700 hover:text-gray-900 hover:bg-black/[0.04]"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge !== null && badge !== "" && (
        <em
          className="ml-auto rounded-full px-1.5 py-px text-[10.5px] font-semibold not-italic text-white"
          style={{ backgroundColor: "#e8614d" }}
        >
          {badge}
        </em>
      )}
    </Link>
  );
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
  const isAffiliatesActive = pathname.startsWith(appRouter.affiliates);

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

      {/* Main navigation */}
      <nav className="flex flex-col gap-0.5">
        <NavItem
          href={appRouter.dashboard}
          icon={PencilSimpleIcon}
          label="Create"
          isActive={isDashboardActive}
          onNavigate={onNavigate}
        />
        <NavItem
          href={appRouter.business}
          icon={UserCircleIcon}
          label="My Business"
          isActive={isBusinessActive}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Accounts section */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            My accounts
          </span>
          <Link
            href={appRouter.accounts}
            onClick={onNavigate}
            title="Account settings"
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-black/[0.05] hover:text-gray-700 transition-colors"
          >
            <GearSixIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex flex-col gap-0.5">
          {accounts.map((account) => {
            const platform = getPlatform(account.platform);
            const isActive = pathname === `/d/channels/${account.id}`;
            const color = platform?.color ?? "#666";
            return (
              <Link
                key={account.id}
                href={`/d/channels/${account.id}`}
                onClick={onNavigate}
                className={`group relative flex items-center gap-2.5 rounded-lg pl-1.5 pr-2 py-1.5 text-left transition-colors ${
                  isActive
                    ? "bg-white shadow-sm"
                    : "hover:bg-black/[0.035]"
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
                <span className="flex flex-col leading-tight min-w-0">
                  <span className="truncate text-[13px] font-medium text-gray-900">
                    {account.username}
                  </span>
                  <span className="truncate text-[11px] text-gray-500">
                    {platform?.label ?? account.platform}
                  </span>
                </span>
              </Link>
            );
          })}

          <Link
            href={appRouter.accounts}
            onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-lg pl-1.5 pr-2 py-1.5 text-left transition-colors hover:bg-black/[0.035]"
          >
            <span className="self-stretch w-[3px] rounded-sm bg-black/[0.08] shrink-0" />
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-dashed border-gray-300 text-gray-400 shrink-0">
              <PlusIcon className="h-3 w-3" />
            </span>
            <span className="text-[13px] text-gray-500">Add account</span>
          </Link>
        </div>
      </div>

      {/* Footer: usage meter + affiliates + user */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200/80">
        <UsageMeter />

        <NavItem
          href={appRouter.affiliates}
          icon={GiftIcon}
          label="Affiliates"
          isActive={isAffiliatesActive}
          ghost
          onNavigate={onNavigate}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg bg-white px-2 py-1.5 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[11px] font-semibold shrink-0"
                style={{
                  background: "linear-gradient(135deg, #ec6f5b, #c84a35)",
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
