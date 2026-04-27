"use client";

import { LightbulbIcon, PencilLineIcon } from "@phosphor-icons/react";

interface PublishEntryProps {
  onGetIdeas: () => void;
  onCreatePost: () => void;
}

export default function PublishEntry({
  onGetIdeas,
  onCreatePost,
}: PublishEntryProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-3xl mx-auto px-2">
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight text-center">
        What do you want to do?
      </h1>
      <p className="text-base text-gray-500 text-center mt-3 mb-10">
        We draft. You publish.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <EntryCard
          title="Get ideas"
          description="No idea what to post? We'll generate posts tailored to your business."
          icon={
            <LightbulbIcon
              className="h-6 w-6"
              weight="duotone"
              style={{ color: "#e8614d" }}
            />
          }
          onClick={onGetIdeas}
        />
        <EntryCard
          title="Create post"
          description="Tell us what to publish — we'll write it."
          icon={
            <PencilLineIcon
              className="h-6 w-6"
              weight="duotone"
              style={{ color: "#e8614d" }}
            />
          }
          onClick={onCreatePost}
        />
      </div>
    </div>
  );
}

function EntryCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start text-left rounded-2xl border border-gray-200/80 bg-white p-7 cursor-pointer transition-all hover:border-[#e8614d]/40 hover:shadow-[0_10px_40px_-12px_rgba(232,97,77,0.25)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8614d]/40"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: "#fef2f0" }}
      >
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-gray-900 mt-5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mt-1.5">
        {description}
      </p>
    </button>
  );
}
