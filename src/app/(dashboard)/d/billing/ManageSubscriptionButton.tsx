"use client";

import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { ArrowSquareOutIcon, CircleNotchIcon } from "@phosphor-icons/react";

export function ManageSubscriptionButton() {
  const { usePost } = useApi();

  const { mutate, isPending } = usePost(appRouter.api.billingPortal, {
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => mutate({})}
      disabled={isPending}
    >
      {isPending ? (
        <CircleNotchIcon className="animate-spin" />
      ) : (
        <ArrowSquareOutIcon />
      )}
      Manage Subscription
    </Button>
  );
}
