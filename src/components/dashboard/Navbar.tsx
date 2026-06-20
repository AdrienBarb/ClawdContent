"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import { useSession } from "@/lib/better-auth/auth-client";
import { signOutWithReset } from "@/lib/better-auth/logout";
import {
  CreditCardIcon,
  GearSixIcon,
  SignOutIcon,
  HouseIcon,
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

const menuItems = [
  { href: appRouter.dashboard, label: "Dashboard", icon: HouseIcon },
  { href: appRouter.business, label: "My business", icon: UserCircleIcon },
  { href: appRouter.accounts, label: "Accounts", icon: PlugsIcon },
  { href: appRouter.media, label: "Media", icon: ImagesIcon },
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

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOutWithReset();
    router.push("/");
  };

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

        <div className="flex-1 min-w-0" />

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
