// Centralized route configuration
export const appRouter = {
  // Public routes
  home: "/",
  pricing: "/pricing",
  blog: "/blog",
  privacy: "/privacy",
  terms: "/terms",

  // Auth routes
  signin: "/signin",
  signup: "/signup",
  resetPassword: "/reset-password",

  // Dashboard routes (protected)
  dashboard: "/d",
  settings: "/d/settings",
  billing: "/d/billing",

  // API routes
  api: {
    auth: "/api/auth",
    webhooks: {
      stripe: "/api/webhooks/stripe",
    },
  },
};
