import { serve } from "inngest/next";
import { inngest, functions } from "@/inngest";

// Media steps (carousel chains, Veo downloads) run long — give the Inngest
// executor the full window Vercel allows and stream to keep it alive.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  streaming: true,
});
