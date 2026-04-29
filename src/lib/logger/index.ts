import { isProduction } from "@/utils/environments";

// Generic dev-only namespaced logger. Use this everywhere we want verbose
// tracing in development without polluting production logs.
//
// Usage:
//   import { createLogger } from "@/lib/logger";
//   const log = createLogger("usage");
//   log.info("consume", { userId, points });   // → [usage] consume {...}
//
// Conventions:
//   .info / .warn — silenced in production
//   .error        — always logs (real errors are useful in prod too)
export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(namespace: string): Logger {
  const tag = `[${namespace}]`;
  return {
    info: (...args: unknown[]) => {
      if (!isProduction) console.log(tag, ...args);
    },
    warn: (...args: unknown[]) => {
      if (!isProduction) console.warn(tag, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(tag, ...args);
    },
  };
}
