"use client";

import { HexColorPicker, HexColorInput } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
}

/**
 * A polished swatch → popover colour picker built on react-colorful, styled to
 * the dashboard tokens. Controlled: `value` is a hex string, `onChange` fires
 * on drag and on hex-input edits.
 */
export function ColorPicker({ value, onChange, ariaLabel }: ColorPickerProps) {
  const swatch = value || "#ffffff";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? "Edit colour"}
          className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 shadow-sm transition-transform cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/40"
          style={{ backgroundColor: swatch }}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-xl border-gray-200 p-3"
      >
        <div className="space-y-3">
          <HexColorPicker color={value || "#000000"} onChange={onChange} />
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5">
            <span className="text-xs font-medium text-gray-400">#</span>
            <HexColorInput
              color={value || ""}
              onChange={onChange}
              prefixed={false}
              placeholder="000000"
              aria-label="Hex colour value"
              className="w-full bg-transparent text-sm uppercase tracking-wide text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
