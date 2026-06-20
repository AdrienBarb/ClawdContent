import { signOut } from "./auth-client";
import { resetClientIdentity } from "@/lib/tracking/clientEvents";

/**
 * The single logout choke point. Resets the PostHog identity BEFORE signing out
 * so the next user on this browser starts as a fresh anonymous person (otherwise
 * identifying them would merge two users into one). Use this everywhere instead
 * of calling `signOut` directly, so the reset can never be forgotten.
 */
export async function signOutWithReset(): Promise<void> {
  resetClientIdentity();
  await signOut();
}
