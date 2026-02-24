"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useErrorStore } from "@/lib/stores/errorStore";
import { signOut } from "@/lib/better-auth/auth-client";

const GlobalErrorHandler = () => {
  const router = useRouter();
  const { isError, statusCode, errorMessage, clearError } = useErrorStore();

  useEffect(() => {
    if (!isError) return;

    switch (statusCode) {
      case 401:
        signOut();
        toast.error(errorMessage || "Session expired. Please sign in again.");
        router.push("/");
        break;

      case 403:
        toast.error(errorMessage || "You don't have permission to access this resource.");
        break;

      case 404:
        router.push("/404");
        break;

      case 400:
        toast.error(errorMessage || "Invalid request. Please check your input.");
        break;

      case 500:
      case 502:
      case 503:
        toast.error(errorMessage || "Server error. Please try again later.");
        break;

      default:
        if (errorMessage) {
          toast.error(errorMessage);
        }
    }

    const timeoutId = setTimeout(() => {
      clearError();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isError, statusCode, errorMessage, router, clearError]);

  return null;
};

export default GlobalErrorHandler;

