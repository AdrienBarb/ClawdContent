"use client";

import { CheckIcon } from "@phosphor-icons/react";
import ConnectAccountButtons from "./ConnectAccountButtons";

interface Props {
  connectedPlatformIds: string[];
  onAccountConnected: () => void;
}

export default function EmptyDashboardState({
  connectedPlatformIds,
  onAccountConnected,
}: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center pt-6 pb-20 text-center">
      {/* Eyebrow ------------------------------------------------- */}
      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8614d] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e8614d]" />
        </span>
        Welcome to PostClaw — one last step
      </div>

      {/* Headline ------------------------------------------------ */}
      <h1 className="mt-6 max-w-lg text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
        Connect one account to get started
      </h1>

      {/* Subhead — explicit -------------------------------------- */}
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-gray-600">
        We&apos;ll look at your account, learn how you talk to your customers,
        and write your first 5 posts. You read them, tap Post, and we publish.
      </p>

      {/* Connect grid -------------------------------------------- */}
      <div className="mt-10 w-full">
        <ConnectAccountButtons
          onAccountConnected={onAccountConnected}
          connectedPlatforms={connectedPlatformIds}
        />
      </div>

      {/* Trust signals ------------------------------------------- */}
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-gray-500">
        <TrustItem>We never post without you tapping Post</TrustItem>
        <TrustItem>Your first 5 posts are free — no credit card</TrustItem>
        <TrustItem>Disconnect any account in one click</TrustItem>
      </ul>

      {/* Divider with text --------------------------------------- */}
      <div className="mt-20 flex w-full items-center gap-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          Watch a 60-second demo
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Demo video --------------------------------------------- */}
      <div
        className="mt-8 w-full"
        style={{
          position: "relative",
          paddingBottom: "calc(54.6% + 41px)",
          height: 0,
        }}
      >
        <iframe
          src="https://demo.arcade.software/H4bhjO5bW6PRNNNqzbNZ?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
          title="A look at PostClaw"
          frameBorder={0}
          loading="lazy"
          allowFullScreen
          allow="clipboard-write"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            colorScheme: "light",
          }}
        />
      </div>
      <p className="mt-3 text-[12.5px] text-gray-500">
        See how a post goes from draft to published.
      </p>
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fef2f0]">
        <CheckIcon className="h-2.5 w-2.5 text-[#e8614d]" weight="bold" />
      </span>
      <span>{children}</span>
    </li>
  );
}
