"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { getPlatform } from "@/lib/constants/platforms";

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
}

interface Props {
  accounts: AccountInfo[];
  selectedId: string;
  onChange: (id: string) => void;
}

/** Single-select sibling of AccountChipSelector — one account per post. */
export function SingleAccountSelector({ accounts, selectedId, onChange }: Props) {
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400 mr-1 shrink-0">
        Posting to
      </span>
      {accounts.map((account) => {
        const platform = getPlatform(account.platform);
        const isSelected = account.id === selectedId;
        return (
          <button
            key={account.id}
            type="button"
            onClick={() => onChange(account.id)}
            aria-pressed={isSelected}
            className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5 text-[12px] cursor-pointer transition-colors border ${
              isSelected
                ? "bg-[#fef2f0] border-[#e8614d] text-gray-900"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <span
              className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-white shrink-0"
              style={{ backgroundColor: platform?.color ?? "#666" }}
            >
              {platform?.icon}
            </span>
            <span className="truncate max-w-[120px]">@{account.username}</span>
            {isSelected && (
              <CheckIcon className="h-3 w-3 text-[#c84a35]" weight="bold" />
            )}
          </button>
        );
      })}
    </div>
  );
}
