import Link from "next/link";
import config from "@/lib/config";

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bg-[#0a0c14] border-t border-[#1e2233]">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">
              {config.project.name}
            </h3>
            <p className="text-sm text-[#7a7f94]">
              {config.project.description}
            </p>
          </div>

          <a
            href={`mailto:${config.contact.supportEmail}`}
            className="text-sm text-[#7a7f94] hover:text-[#e8614d] transition-colors"
          >
            Support
          </a>
        </div>

        <div className="mt-8 border-t border-[#1e2233] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-[#7a7f94]">
              &copy; {currentYear} {config.project.name}. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-[#7a7f94]">
              <Link href="/privacy" className="hover:text-[#e8614d] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[#e8614d] transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
