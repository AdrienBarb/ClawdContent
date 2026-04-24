"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";

interface NewAccount {
  id: string;
  platform: string;
}

export default function AccountsCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usePost } = useApi();
  const [status, setStatus] = useState<"syncing" | "done" | "error">(
    "syncing"
  );

  const returnTo = searchParams.get("returnTo");

  const { mutate: syncAccounts } = usePost(appRouter.api.accountsCallback, {
    onSuccess: (data: { newAccounts?: NewAccount[] }) => {
      setStatus("done");

      if (window.opener) {
        // Pass new account info to parent before closing
        if (data.newAccounts?.length) {
          try {
            (window.opener as Window).postMessage(
              { type: "account-connected", channelId: data.newAccounts[0].id },
              window.location.origin
            );
          } catch {
            // Ignore cross-origin errors
          }
        }
        window.close();
      } else {
        // Redirect to channel page if new account, otherwise returnTo
        const redirectTo = data.newAccounts?.length
          ? `/d?channel=${data.newAccounts[0].id}`
          : returnTo || appRouter.accounts;
        router.push(redirectTo);
      }
    },
    onError: () => {
      setStatus("error");
    },
  });

  useEffect(() => {
    syncAccounts({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center py-20">
      {status === "syncing" && (
        <p className="text-muted-foreground">
          Connecting your account...
        </p>
      )}
      {status === "done" && (
        <p className="text-muted-foreground">
          Account connected! Redirecting...
        </p>
      )}
      {status === "error" && (
        <div className="text-center space-y-2">
          <p className="text-destructive">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => router.push(returnTo || appRouter.accounts)}
            className="text-sm text-primary underline"
          >
            Go back
          </button>
        </div>
      )}
    </div>
  );
}
