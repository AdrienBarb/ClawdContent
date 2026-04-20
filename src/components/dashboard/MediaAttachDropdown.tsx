"use client";

import { ImageIcon, SparkleIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MediaAttachDropdownProps {
  onOpenUpload: () => void;
  onOpenGenerate: () => void;
  disabled?: boolean;
}

export default function MediaAttachDropdown({
  onOpenUpload,
  onOpenGenerate,
  disabled,
}: MediaAttachDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onOpenUpload} className="cursor-pointer">
          <ImageIcon className="h-4 w-4 mr-2" />
          Upload media
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenGenerate} className="cursor-pointer">
          <SparkleIcon className="h-4 w-4 mr-2" />
          Generate image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
