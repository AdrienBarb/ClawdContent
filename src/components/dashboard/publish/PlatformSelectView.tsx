import { CheckIcon } from "@phosphor-icons/react";
import { getPlatform } from "@/lib/constants/platforms";
import { ViewShell, ViewHeading, PrimaryButton } from "./ViewShell";
import type { Mode } from "./types";

export function PlatformSelectView({
  mode,
  accounts,
  selectedIds,
  onToggle,
  onSelectAll,
  onBack,
  onContinue,
}: {
  mode: Mode;
  accounts: { id: string; platform: string; username: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const allSelected = selectedIds.length === accounts.length;
  return (
    <ViewShell onBack={onBack}>
      <ViewHeading
        eyebrow={mode === "ideas" ? "Get ideas" : "Create post"}
        title="Where should we post?"
        subtitle="Pick the accounts you want posts for."
      />

      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Your accounts</p>
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {accounts.map((account) => {
            const platform = getPlatform(account.platform);
            const isSelected = selectedIds.includes(account.id);
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => onToggle(account.id)}
                className={`relative flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#e8614d] bg-[#fef2f0] text-gray-900 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: platform?.color ?? "#666" }}
                >
                  {platform?.icon}
                </span>
                <span className="truncate flex-1 text-left">
                  @{account.username}
                </span>
                {isSelected && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e8614d] text-white shrink-0">
                    <CheckIcon className="h-3 w-3" weight="bold" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-8">
          <span className="text-sm text-gray-500">
            {selectedIds.length} account{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <PrimaryButton
            onClick={onContinue}
            disabled={selectedIds.length === 0}
          >
            {mode === "ideas" ? "Generate" : "Continue"}
          </PrimaryButton>
        </div>
      </div>
    </ViewShell>
  );
}
