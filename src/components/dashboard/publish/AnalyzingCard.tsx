import { SpinnerGapIcon } from "@phosphor-icons/react";

export function AnalyzingCard() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-3xl mx-auto px-2">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
        style={{ backgroundColor: "#fef2f0" }}
      >
        <SpinnerGapIcon
          className="h-7 w-7 animate-spin"
          style={{ color: "#e8614d" }}
        />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1.5">
        Studying your account…
      </h2>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        We&apos;re learning your voice, top posts, and best times. This usually
        takes under a minute — you&apos;ll be able to draft posts as soon as
        we&apos;re done.
      </p>
    </div>
  );
}
