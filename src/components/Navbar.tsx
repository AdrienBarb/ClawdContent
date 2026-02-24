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
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
        <nav className="container mx-auto flex h-20 items-center justify-between px-6">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
          >
            {config.project.shortName || config.project.name}
          </Link>

          {config.features.auth && (
            <>
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer">
                      <Avatar className="h-9 w-9 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                          {getInitials(session.user.name, session.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card rounded-xl shadow-lg border-0">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/d">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => setIsSignInModalOpen(true)}
                  className="px-7 py-5 text-sm font-medium cursor-pointer"
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
