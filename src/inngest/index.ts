export { inngest } from "./client";
import { analyzeAccount, refreshInsights } from "./functions/analyze-account";
import { computeOutcomes } from "./functions/compute-outcomes";
import { onboardingWebsiteAnalyze } from "./functions/onboarding-website-analyze";

export const functions = [
  analyzeAccount,
  refreshInsights,
  computeOutcomes,
  onboardingWebsiteAnalyze,
];
