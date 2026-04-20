import { anthropic } from "@ai-sdk/anthropic";

/** Primary model — reasoning, content creation, tool decisions (step 0). */
export const reasoningModel = anthropic("claude-sonnet-4-6");

/** Fast model — tool result processing, follow-up calls (step 1+). */
export const executionModel = anthropic("claude-haiku-4-5-20251001");
