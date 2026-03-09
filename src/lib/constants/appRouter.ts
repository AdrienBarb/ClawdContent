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
  bot: "/d/bot",
  accounts: "/d/accounts",
  posts: "/d/posts",
  accountsCallback: "/d/accounts/callback",
  settings: "/d/settings",
  billing: "/d/billing",
  onboarding: "/onboarding",

  // API routes
  api: {
    auth: "/api/auth",
    checkout: "/api/checkout",
    bot: "/api/bot",
    accounts: "/api/accounts",
    accountsConnect: "/api/accounts/connect",
    accountsDisconnect: "/api/accounts/disconnect",
    posts: "/api/posts",
    postsDelete: "/api/posts/delete",
    accountsCallback: "/api/accounts/callback",
    provisioningRetry: "/api/provisioning/retry",
    billingPortal: "/api/billing/portal",
    mediaUpload: "/api/media/upload",
    transcribe: "/api/transcribe",
    userTimezone: "/api/user/timezone",
    onboarding: "/api/onboarding",
    dashboardStatus: "/api/dashboard/status",
    webhooks: {
      stripe: "/api/webhooks/stripe",
    },
  },
};
