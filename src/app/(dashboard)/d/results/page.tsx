import type { Metadata } from "next";
import ResultsPage from "@/components/dashboard/results/ResultsPage";

export const metadata: Metadata = {
  title: "Results",
};

export default function Page() {
  return <ResultsPage />;
}
