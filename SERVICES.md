# External Services & APIs

All third-party services used by PostClaw, with their purpose and billing model.

| Service | Purpose | Env Var | Billing |
|---------|---------|---------|---------|
| **Stripe** | Payments & subscriptions | `STRIPE_SECRET_KEY` | Per-transaction fees |
| **Moonshot (Kimi K2.5)** | LLM powering the chatbot | `MOONSHOT_API_KEY` | Per-token usage |
| **OpenAI** | Image generation (GPT-Image-1) + audio transcription (gpt-4o-mini-transcribe) | `OPENAI_API_KEY` | Per-request usage |
| **Late API** (getlate.dev) | Social media posting | `LATE_API_KEY` | Accelerate plan $49/mo (50 social sets) |
| **Fly.io** | Container hosting (1 machine per user) | `FLY_API_TOKEN` | ~$7-10/mo per machine |
| **Supabase** | PostgreSQL database | `DATABASE_URL` | Plan-based (storage + connections) |
| **Resend** | Transactional emails | `RESEND_API_KEY` | Free tier then per-email |
| **Cloudinary** | Media uploads (images/videos) | `CLOUDINARY_API_KEY` | Free tier then storage + bandwidth |
| **PostHog** | Analytics & A/B testing | `NEXT_PUBLIC_POSTHOG_KEY` | Free tier then per-event |
| **Vercel** | Next.js hosting | (deployed via git) | Plan-based |
| **Better Auth** | Authentication | `BETTER_AUTH_SECRET` | Self-hosted (no external cost) |
