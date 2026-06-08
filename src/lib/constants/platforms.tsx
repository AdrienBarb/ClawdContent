import React from "react";
import { SiInstagram, SiFacebook } from "react-icons/si";

export interface PlatformConfig {
  id: string;
  label: string;
  color: string;
  bgLight: string;
  icon: React.ReactNode;
}

const iconClass = "h-3.5 w-3.5";

export const PLATFORMS: PlatformConfig[] = [
  {
    id: "instagram",
    label: "Instagram",
    color: "#E4405F",
    bgLight: "#fce8ec",
    icon: <SiInstagram className={iconClass} />,
  },
  {
    id: "facebook",
    label: "Facebook",
    color: "#0866FF",
    bgLight: "#e6f0ff",
    icon: <SiFacebook className={iconClass} />,
  },
];

export function getPlatform(id: string): PlatformConfig | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
