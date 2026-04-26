export { inngest } from "./client";
import { analyzeAccount, refreshInsights } from "./functions/analyze-account";

export const functions = [analyzeAccount, refreshInsights];
