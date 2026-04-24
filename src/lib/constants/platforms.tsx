import React from "react";
import {
  SiX,
  SiBluesky,
  SiThreads,
  SiInstagram,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiPinterest,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

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
    id: "twitter",
    label: "Twitter / X",
    color: "#000000",
    bgLight: "#f5f5f5",
    icon: <SiX className={iconClass} />,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    bgLight: "#e8f1fb",
    icon: <FaLinkedinIn className={iconClass} />,
  },
  {
    id: "bluesky",
    label: "Bluesky",
    color: "#0085FF",
    bgLight: "#e6f2ff",
    icon: <SiBluesky className={iconClass} />,
  },
  {
    id: "threads",
    label: "Threads",
    color: "#000000",
    bgLight: "#f5f5f5",
    icon: <SiThreads className={iconClass} />,
  },
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
  {
    id: "tiktok",
    label: "TikTok",
    color: "#000000",
    bgLight: "#f5f5f5",
    icon: <SiTiktok className={iconClass} />,
  },
  {
    id: "youtube",
    label: "YouTube",
    color: "#FF0000",
    bgLight: "#ffe6e6",
    icon: <SiYoutube className={iconClass} />,
  },
  {
    id: "pinterest",
    label: "Pinterest",
    color: "#BD081C",
    bgLight: "#fce6e9",
    icon: <SiPinterest className={iconClass} />,
  },
];

export function getPlatform(id: string): PlatformConfig | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
