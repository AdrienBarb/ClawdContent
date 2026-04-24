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
import { ListIcon, XIcon } from "@phosphor-icons/react";

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
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <nav className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <XIcon className="h-6 w-6" /> : <ListIcon className="h-6 w-6" />}
            </button>
            <Link
              href="/"
              className="hidden md:block text-2xl font-bold text-foreground hover:text-primary transition-colors"
            >
              {config.project.shortName || config.project.name}
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#who-is-this-for" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Who It's For
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <Link href="/affiliates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Affiliates
              </Link>
            </div>
          </div>

          {config.features.auth && (
            <>
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer">
                      <Avatar className="h-9 w-9 border-2 border-primary/30">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                          {getInitials(session.user.name, session.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border rounded-xl shadow-lg">
                    <DropdownMenuItem asChild className="cursor-pointer text-foreground focus:bg-muted focus:text-foreground">
                      <Link href="/d">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-foreground focus:bg-muted focus:text-foreground"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => setIsSignInModalOpen(true)}
                  variant="outline"
                  className="hidden md:inline-flex px-5 py-2 text-sm font-medium cursor-pointer border-foreground/20 text-foreground hover:bg-foreground hover:text-primary-foreground rounded-full transition-all"
                >
                  Get started free
                </Button>
              )}
            </>
          )}
        </nav>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md px-6 py-4 space-y-4">
            <a
              href="#who-is-this-for"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Who It's For
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/affiliates"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Affiliates
            </Link>
            {config.features.auth && !session?.user && (
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSignInModalOpen(true);
                }}
                className="w-full text-sm font-medium cursor-pointer bg-primary hover:bg-[#E84A36] text-primary-foreground rounded-full"
              >
                Get started free
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
