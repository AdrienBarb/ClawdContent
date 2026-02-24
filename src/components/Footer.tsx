import Link from "next/link";
import config from "@/lib/config";

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold">
              {config.project.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {config.project.description}
            </p>
          </div>

          <a
            href={`mailto:${config.contact.supportEmail}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Support
          </a>
        </div>

        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} {config.project.name}. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
