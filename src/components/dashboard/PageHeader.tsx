interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  right,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={`flex items-start justify-between gap-4 pb-5 border-b border-gray-200 ${className ?? ""}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
