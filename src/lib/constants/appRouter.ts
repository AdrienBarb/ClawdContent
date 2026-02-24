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
  subscribe: "/d/subscribe",
  bot: "/d/bot",
  accounts: "/d/accounts",
  accountsCallback: "/d/accounts/callback",
  settings: "/d/settings",
  billing: "/d/billing",

  // API routes
  api: {
    auth: "/api/auth",
    checkout: "/api/checkout",
    bot: "/api/bot",
    accounts: "/api/accounts",
    accountsConnect: "/api/accounts/connect",
    accountsCallback: "/api/accounts/callback",
    provisioningRetry: "/api/provisioning/retry",
    dashboardStatus: "/api/dashboard/status",
    webhooks: {
      stripe: "/api/webhooks/stripe",
    },
  },
};
