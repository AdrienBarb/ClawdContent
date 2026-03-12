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
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
          <div className="flex items-center gap-8">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-[#8a8f9e] hover:text-white transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link
              href="/"
              className="hidden md:block text-2xl font-bold text-white hover:text-[#e8614d] transition-colors"
            >
              {config.project.shortName || config.project.name}
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm text-[#8a8f9e] hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-[#8a8f9e] hover:text-white transition-colors">
                Pricing
              </a>
            </div>
          </div>

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
                  className="hidden md:inline-flex px-7 py-5 text-sm font-medium cursor-pointer bg-[#e8614d] hover:bg-[#d4563f] text-white"
                >
                  Get Started
                </Button>
              )}
            </>
          )}
        </nav>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#1e2233]/50 bg-[#0d0f17]/95 backdrop-blur-md px-6 py-4 space-y-4">
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-[#8a8f9e] hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-[#8a8f9e] hover:text-white transition-colors"
            >
              Pricing
            </a>
            {config.features.auth && !session?.user && (
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSignInModalOpen(true);
                }}
                className="w-full text-sm font-medium cursor-pointer bg-[#e8614d] hover:bg-[#d4563f] text-white"
              >
                Get Started
              </Button>
            )}
          </div>
        )}
      </header>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </>
  );
}
