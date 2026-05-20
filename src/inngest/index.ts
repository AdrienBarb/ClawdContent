export { inngest } from "./client";
import { analyzeAccount, refreshInsights } from "./functions/analyze-account";
import { computeOutcomes } from "./functions/compute-outcomes";
import {
  weeklyGenerateFanout,
  weeklyGenerateForUser,
  generateFirstWeekForAccount,
} from "./functions/weekly-generate";

export const functions = [
  analyzeAccount,
  refreshInsights,
  computeOutcomes,
  weeklyGenerateFanout,
  weeklyGenerateForUser,
  generateFirstWeekForAccount,
];
