import React from "react";
import { SiInstagram } from "react-icons/si";

export interface PlatformConfig {
  id: string;
  label: string;
  color: string;
  bgLight: string;
  icon: React.ReactNode;
  /**
   * Solid brand fill (gradient or solid) for the full-width stacked connect
   * buttons. White text sits on this, so the value clears WCAG AA (≥4.5:1): the
   * Instagram gradient stops short of its light yellow tail (each stop ~5.1–6.1:1).
   */
  solidFill: string;
  /** Larger brand glyph for the stacked connect buttons. */
  iconLarge: React.ReactNode;
}

const iconClass = "h-3.5 w-3.5";
const iconLargeClass = "h-5 w-5";

export const PLATFORMS: PlatformConfig[] = [
  {
    id: "instagram",
    label: "Instagram",
    color: "#E4405F",
    bgLight: "#fce8ec",
    icon: <SiInstagram className={iconClass} />,
    solidFill:
      "linear-gradient(135deg, #4F5BD5 0%, #962FBF 45%, #C13584 100%)",
    iconLarge: <SiInstagram className={iconLargeClass} />,
  },
];

export function getPlatform(id: string): PlatformConfig | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
