import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0e1a] px-6 text-center">
      <h1 className="text-7xl font-bold text-[#e8614d]">404</h1>
      <p className="mt-4 text-xl font-medium text-white">Page not found</p>
      <p className="mt-2 text-[#7a7f94]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-xl bg-[#e8614d] px-8 font-medium text-white transition-colors hover:bg-[#d4563f]"
      >
        Back to Home
      </Link>
    </div>
  );
}
