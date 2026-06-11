import { redirect } from "next/navigation";

// Analytics was replaced by the trimmed Results view — keep this route so old
// links survive. Components under src/components/dashboard remain untouched.
export default function AnalyticsPage() {
  redirect("/d/results");
}
