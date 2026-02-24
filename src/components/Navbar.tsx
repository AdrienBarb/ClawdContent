"use client";

import { useState } from "react";
import Link from "next/link";
import config from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/better-auth/auth-client";
import SignInModal from "@/components/SignInModal";

export default function Navbar() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#0d0f17]/80 backdrop-blur-md border-b border-[#1e2233]/50">
        <nav className="container mx-auto flex h-20 items-center justify-between px-6">
          <Link
            href="/"
            className="text-2xl font-bold text-white hover:text-[#e8614d] transition-colors"
          >
            {config.project.shortName || config.project.name}
          </Link>

          {config.features.auth && (
            <>
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer">
                      <Avatar className="h-9 w-9 border-2 border-[#e8614d]/30">
                        <AvatarFallback className="bg-[#e8614d]/10 text-[#e8614d] font-medium text-sm">
                          {getInitials(session.user.name, session.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#151929] border-[#1e2233] rounded-xl shadow-lg">
                    <DropdownMenuItem asChild className="cursor-pointer text-[#e8e9f0] focus:bg-[#1c2035] focus:text-white">
                      <Link href="/d">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-[#e8e9f0] focus:bg-[#1c2035] focus:text-white"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => setIsSignInModalOpen(true)}
                  className="px-7 py-5 text-sm font-medium cursor-pointer bg-[#e8614d] hover:bg-[#d4563f] text-white"
                >
                  Get Started
                </Button>
              )}
            </>
          )}
        </nav>
      </header>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </>
  );
}
