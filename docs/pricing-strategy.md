# PostClaw Pricing Strategy

**Date:** 2026-04-24
**Status:** Ready to test

---

## Decisions

### 1. Single plan (no tiers)

Drop the 3-tier structure (Starter $17 / Pro $37 / Business $79) in favor of **one plan, all-inclusive**.

**Why:**
- PostClaw has one ICP (non-tech small business owners) — no need for segmentation
- Paradox of Choice (Iyengar & Lepper, 2000): fewer options = higher conversion. 6 choices → 30% purchase rate vs 24 choices → 3%
- Pricing page friction: users with 3+ tiers spend 40-60% more time deciding → higher bounce (heatmap studies)
- Precedent: Basecamp ($100M+ ARR), Hey, Carrd — all single plan, all profitable

**What's included:**
- AI social media manager
- All social accounts (up to 9)
- Unlimited posts
- AI content adapted per platform
- Scheduling & automation
- Brand voice memory
- Content calendar planning
- Performance analytics
- AI image generation (10/month)

### 2. Five free posts before paywall

Replace the current "1 free message" model with **5 free published posts**.

**Why:**
- Current paywall hits before the "aha moment" (seeing a post published on their socials)
- Paywall after aha moment = +25-40% conversion (Intercom 2024)
- Content tools with 5-10 free credits: 8-12% conversion (SaaS benchmarks)
- Slack's 2,000 messages threshold: 93% retention for activated users (S-1 filing, 2019)
- Dropbox file sync: retention jumped from 25% to 50% after one file synced (2011)

**The aha moment for PostClaw** = user sees a post published on their social accounts via chat. 1 message is not enough to reach it (connect account + ask for post + publish = 3-5 messages minimum).

### 3. Price testing: sequential cohort method

Test 3 price points sequentially, starting high. New signups only — existing customers keep their price (grandfather).

| Order | Price | Rationale | Duration |
|-------|-------|-----------|----------|
| 1st | **$49/mo** | Aligned with competitors (Jasper $39, Copy.ai $49). Left-digit = "forty-something". Start high to find the ceiling. | 4-6 weeks |
| 2nd | **$39/mo** | Anderson & Simester (2003): 9-ending in the "thirties" is the universal sweet spot. Test if lower price drives meaningfully more conversion. | 4-6 weeks |
| 3rd | **$59/mo** | Test the ceiling. If retention holds, +$10/user/month is significant. | 4-6 weeks |

**Why start at $49:** Easier to lower a price than raise it. Starting high reveals the ceiling.

**Key metric to track:** Number of posts published before conversion. This is PostClaw's equivalent of Slack's "2,000 messages" — the activation threshold.

### 4. Pricing psychology: always end in 9

Prices ending in 9 generate **+24% demand** vs rounded prices (8M transaction study, Quantitative Marketing & Economics).

**Key studies:**
- Anderson & Simester (2003): $39 outsold both $34 and $44 by +20%
- Thomas & Morwitz (2005): left-digit effect — $49 is perceived as "forty-something", $50 as "fifty"
- Wadhwa & Zhang (2015): round prices work for luxury, but PostClaw targets budget-conscious SMBs → charm pricing applies

**Avoid:** $40, $50, $60 — they cross the left-digit threshold for no benefit.

---

## Yearly discount

Keep 30% yearly discount (aggressive vs standard 20-25%, but annual buyers have 70% lower churn per ProfitWell).

---

## Anchoring on landing page

Frame price against the cost of a freelance social media manager ($500-2,000/mo), not against other tools. Contrast anchoring can increase conversion +20-30% (Cialdini, *Influence*).

---

## Sources

- Anderson & Simester, *Journal of Marketing Research* (2003) — $34/$39/$44 experiment
- Thomas & Morwitz, *Journal of Consumer Research* (2005) — left-digit effect
- Wadhwa & Zhang, *Journal of Consumer Research* (2015) — round vs precise pricing
- Iyengar & Lepper (2000) — paradox of choice / jam study
- Schwartz, *The Paradox of Choice* (2004)
- OpenView Partners PLG Benchmarks (2019, 2022, 2025)
- ProfitWell/Paddle pricing research
- Intercom State of SaaS (2024) — paywall timing
- Amplitude onboarding data (2024)
- Slack S-1 SEC filing (2019) — 2,000 messages activation
- Dropbox activation studies (2011)
