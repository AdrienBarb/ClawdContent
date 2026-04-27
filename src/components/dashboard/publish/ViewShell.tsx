import { ArrowLeftIcon, SparkleIcon } from "@phosphor-icons/react";

export function ViewShell({
  children,
  onBack,
  backLabel = "Back",
}: {
  children: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="h-12 flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer rounded-lg px-2 py-1 -ml-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {backLabel}
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-8">
        {children}
      </div>
    </div>
  );
}

export function ViewHeading({
  eyebrow,
  title,
  subtitle,
  icon,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center max-w-xl mb-8">
      {icon && (
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
          style={{ backgroundColor: "#fef2f0" }}
        >
          <span className="h-6 w-6" style={{ color: "#e8614d" }}>
            {icon}
          </span>
        </span>
      )}
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-[#e8614d] mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-gray-500 mt-3 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  size = "md",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const sizing =
    size === "lg" ? "h-12 px-6 text-base" : "h-10 px-5 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full font-medium text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_30px_-10px_rgba(232,97,77,0.55)] hover:-translate-y-0.5 ${sizing}`}
      style={{ backgroundColor: "#e8614d" }}
    >
      <SparkleIcon className="h-4 w-4" weight="fill" />
      {children}
    </button>
  );
}
