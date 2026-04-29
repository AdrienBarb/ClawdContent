export { inngest } from "./client";
import { analyzeAccount, refreshInsights } from "./functions/analyze-account";
import { computeOutcomes } from "./functions/compute-outcomes";

export const functions = [analyzeAccount, refreshInsights, computeOutcomes];
