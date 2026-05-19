import { WarningCircleIcon } from "@phosphor-icons/react";

/** Persistent inline error surface. Toasts disappear too quickly for users
 * who tab away; this stays visible until the next attempt succeeds. Lives
 * inside each step so it's positioned next to the action that produced it. */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5"
    >
      <WarningCircleIcon className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 text-xs text-red-700 underline underline-offset-4 hover:text-red-900 cursor-pointer"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
