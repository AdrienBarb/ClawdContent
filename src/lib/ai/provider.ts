import { anthropic } from "@ai-sdk/anthropic";

/** Single model for all steps — reliable reasoning across the full agent loop. */
export const model = anthropic("claude-haiku-4-5-20251001");
