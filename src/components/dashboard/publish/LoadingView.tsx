import { SpinnerGapIcon } from "@phosphor-icons/react";
import type { Mode } from "./types";

export function LoadingView({
  mode,
  onCancel,
}: {
  mode: Mode;
  onCancel: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <SpinnerGapIcon
        className="h-12 w-12 animate-spin"
        style={{ color: "#e8614d" }}
      />
      <p className="text-base font-medium text-gray-900 mt-6">
        {mode === "ideas"
          ? "Generating your ideas…"
          : "Drafting your posts…"}
      </p>
      <p className="text-sm text-gray-500 mt-1.5">
        This usually takes about a minute.
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="mt-6 text-sm text-gray-500 hover:text-gray-900 underline underline-offset-4 cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
