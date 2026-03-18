// Centralized route configuration
export const appRouter = {
  // Public routes
  home: "/",
  pricing: "/pricing",
  blog: "/blog",
  affiliates: "/affiliates",
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
  context: "/d/context",
  settings: "/d/settings",
  billing: "/d/billing",
  credits: "/d/credits",
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
    provisioningLaunch: "/api/provisioning/launch",
    provisioningRetry: "/api/provisioning/retry",
    billingPortal: "/api/billing/portal",
    billingChangePlan: "/api/billing/change-plan",
    mediaUpload: "/api/media/upload",
    transcribe: "/api/transcribe",
    userTimezone: "/api/user/timezone",
    userContext: "/api/user/context",
    onboarding: "/api/onboarding",
    chat: "/api/chat",
    chatHistory: "/api/chat/history",
    credits: "/api/credits",
    creditsCheckout: "/api/credits/checkout",
    imageGenerate: "/api/image/generate",
    dashboardStatus: "/api/dashboard/status",
    webhooks: {
      stripe: "/api/webhooks/stripe",
    },
  },
};
