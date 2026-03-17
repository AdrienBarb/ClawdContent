"use client";

import { Paperclip, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MediaAttachDropdownProps {
  onOpenUpload: () => void;
  onOpenGenerate: () => void;
}

export default function MediaAttachDropdown({
  onOpenUpload,
  onOpenGenerate,
}: MediaAttachDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onOpenUpload} className="cursor-pointer">
          <ImageIcon className="h-4 w-4 mr-2" />
          Upload media
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenGenerate} className="cursor-pointer">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
