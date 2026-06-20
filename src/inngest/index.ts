export { inngest } from "./client";
import { analyzeAccount, refreshInsights } from "./functions/analyze-account";
import { computeOutcomes } from "./functions/compute-outcomes";
import { onboardingWebsiteAnalyze } from "./functions/onboarding-website-analyze";
import { generateBusinessStrategy } from "./functions/business-strategy";
import {
  autopilotDispatch,
  autopilotGenerateWeek,
} from "./functions/autopilot";
import {
  reconcileBilling,
  reapInactiveProfiles,
} from "./functions/lifecycle";

export const functions = [
  analyzeAccount,
  refreshInsights,
  computeOutcomes,
  onboardingWebsiteAnalyze,
  generateBusinessStrategy,
  autopilotDispatch,
  autopilotGenerateWeek,
  reconcileBilling,
  reapInactiveProfiles,
];
