"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";

interface StartCheckoutResult {
  start: () => void;
  isOpening: boolean;
  hasErrored: boolean;
}

interface CheckoutError {
  response?: { status?: number };
}

/**
 * Drives the "click → open Stripe checkout" flow. Returns hasErrored so the
 * caller can render a retry UI instead of leaving the user on an indefinite
 * spinner. Surfaces 409 ALREADY_SUBSCRIBED by routing the user to /d, since
 * the dashboard layout will land them on the right screen for their state.
 */
export function useStartCheckout(): StartCheckoutResult {
  const { usePost } = useApi();
  const [isOpening, setIsOpening] = useState(false);
  const [hasErrored, setHasErrored] = useState(false);

  const { mutate } = usePost(appRouter.api.checkout, {
    onSuccess: (data: { url: string }) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Couldn't open checkout. Please try again.");
        setIsOpening(false);
        setHasErrored(true);
      }
    },
    onError: (error: CheckoutError) => {
      if (error?.response?.status === 409) {
        window.location.href = "/d";
        return;
      }
      toast.error("Couldn't open checkout. Please try again.");
      setIsOpening(false);
      setHasErrored(true);
    },
  });

  const start = () => {
    setHasErrored(false);
    setIsOpening(true);
    mutate({ planId: "pro", interval: "monthly" });
  };

  return { start, isOpening, hasErrored };
}
