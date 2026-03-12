"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0e1a] px-6 text-center">
      <h1 className="text-5xl font-bold text-white">Something went wrong</h1>
      <p className="mt-4 text-[#7a7f94]">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex h-12 cursor-pointer items-center rounded-xl bg-[#e8614d] px-8 font-medium text-white transition-colors hover:bg-[#d4563f]"
      >
        Try again
      </button>
    </div>
  );
}
