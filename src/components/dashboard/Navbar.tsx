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
  GiftIcon,
  PlusIcon,
  UserCircleIcon,
  PlugsIcon,
  ImagesIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
}

const menuItems = [
  { href: appRouter.business, label: "My business", icon: UserCircleIcon },
  { href: appRouter.accounts, label: "Accounts", icon: PlugsIcon },
  { href: appRouter.media, label: "Media", icon: ImagesIcon },
  { href: appRouter.billing, label: "Billing", icon: CreditCardIcon },
  { href: appRouter.settings, label: "Settings", icon: GearSixIcon },
  { href: appRouter.affiliates, label: "Affiliates", icon: GiftIcon },
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

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
        isActive
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-600 hover:text-gray-900 hover:bg-black/[0.04]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
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

  const isWeekActive =
    pathname === "/d" || pathname === "/d/" || pathname.startsWith("/d/channels");
  const isResultsActive = pathname.startsWith("/d/results");

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-[#faf9f5]">
      <div className="flex h-14 items-center gap-3 px-4 md:px-8 min-w-0">
        <Link
          href={appRouter.dashboard}
          className="flex shrink-0 items-center gap-2 -tracking-[0.01em]"
        >
          <Image
            src="/logo-icon.png"
            alt="PostClaw"
            width={28}
            height={28}
            priority
            className="h-7 w-7 shrink-0 rounded-lg"
          />
          <span className="hidden sm:block text-[15px] font-bold text-gray-900">
            PostClaw
          </span>
        </Link>

        <nav className="flex items-center gap-1 ml-2 shrink-0">
          <NavLink href={appRouter.dashboard} label="My week" isActive={isWeekActive} />
          <NavLink
            href={appRouter.results}
            label="Results"
            isActive={isResultsActive}
          />
        </nav>

        <div className="flex-1 min-w-0" />

        {/* Account chips */}
        <div className="hidden md:flex items-center gap-1.5 min-w-0 overflow-x-auto">
          {accounts.map((account) => {
            const platform = getPlatform(account.platform);
            const color = platform?.color ?? "#666";
            const isActive = pathname === `/d/channels/${account.id}`;
            return (
              <Link
                key={account.id}
                href={`/d/channels/${account.id}`}
                title={`${platform?.label ?? account.platform} · @${account.username}`}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 transition-colors ${
                  isActive
                    ? "border-gray-300 bg-white shadow-sm"
                    : "border-transparent hover:bg-black/[0.04]"
                }`}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-white [&_svg]:h-3 [&_svg]:w-3"
                  style={{ backgroundColor: color }}
                >
                  {platform?.icon}
                </span>
                <span className="max-w-[110px] truncate text-[12px] font-medium text-gray-700">
                  {account.username}
                </span>
              </Link>
            );
          })}
          <Link
            href={appRouter.accounts}
            title="Add account"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:bg-black/[0.04] hover:text-gray-600 transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-semibold cursor-pointer"
              style={{ background: "linear-gradient(135deg, #6b7280, #374151)" }}
            >
              {getInitials(session?.user?.name, session?.user?.email)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-56" sideOffset={6}>
            <div className="px-2 py-1.5 leading-tight">
              <p className="truncate text-[12px] font-medium text-gray-900">
                {session?.user?.name || "User"}
              </p>
              <p className="truncate text-[11px] text-gray-500">
                {session?.user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            {menuItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
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
    </header>
  );
}
