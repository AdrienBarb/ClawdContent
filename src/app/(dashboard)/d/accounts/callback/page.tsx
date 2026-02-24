"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";

export default function AccountsCallbackPage() {
  const router = useRouter();
  const { usePost } = useApi();
  const [status, setStatus] = useState<"syncing" | "done" | "error">(
    "syncing"
  );

  const { mutate: syncAccounts } = usePost(appRouter.api.accountsCallback, {
    onSuccess: () => {
      setStatus("done");
      // If opened in a popup, close it
      if (window.opener) {
        window.close();
      } else {
        router.push(appRouter.accounts);
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
          Syncing your account... Please wait.
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
            Something went wrong syncing your account.
          </p>
          <button
            onClick={() => router.push(appRouter.accounts)}
            className="text-sm text-primary underline"
          >
            Go back to accounts
          </button>
        </div>
      )}
    </div>
  );
}
