# PMF Analysis — April 22, 2026

## Decision: Target small business owners, not tech founders

PostClaw should target **non-tech small business owners** (photographers, caterers, coaches, artists, consultants, agents) — not indie hackers or SaaS founders. The data validates this: real engaged users are real-world business owners who need help with social media.

**Why:** Database analysis of 196 users showed that the most engaged paying users are all non-tech small business owners. Tech founders who signed up either churned or never connected accounts.

**How to apply:** Every product, design, and marketing decision should be evaluated through the lens of "would a photographer or a caterer in Leeds understand and benefit from this?"

---

## Database Snapshot (April 22, 2026)

### Funnel

| Stage | Count | % |
|-------|-------|---|
| Total signups | 196 | 100% |
| Completed onboarding | 161 | 82% |
| Active subscription | 43 | 22% |
| Connected 1+ social account | 20 | 10% |
| Sent 1+ chat message | 36 | 18% |
| 50+ messages (power users) | 6 | 3% |

### Real Power Users

1. **Adontai Mason** — Content creator, spiritual writer. Business $79. 654 messages. 9 platforms. Daily active since March 20.
2. **Casa Lasagna Leeds** — Caterer. Pro $37. 124 messages. 3 platforms (FB/IG/LinkedIn). Daily active.
3. **Stefan Wisnewski** — Laravel dev, Germany. Pro $37. 76 messages. 0 active accounts (chats but doesn't publish).
4. **Brandon Bennett** — Marketing manager. Starter $17. 44 messages. 1 platform (Facebook).
5. **Fabienne Nigg** — Family photographer. Starter $17. 39 messages. Inactive 12 days.
6. **Paul Sidney** — Ebook seller. Starter $17. 29 messages. 2 platforms (TikTok/YouTube).

### Churn Pattern

All 3 meaningful churns (Alex, Phil Portman, Sarah Timmons) had the SAME pattern: chatted a lot (14-76 messages) but **never connected a social account**. They engaged with the AI without ever reaching the actual value (publishing).

### Platform Popularity (real users)

1. Instagram — 11 users
2. Facebook — 8
3. Twitter — 6
4. Threads/TikTok/LinkedIn — 5 each
5. YouTube — 4
6. Reddit — 4
7. Bluesky/Pinterest — 1 each

Instagram + Facebook dominate. Not Twitter/Bluesky.

### Fraud Problem

~25 suspicious hotmail/outlook accounts with generated emails. 13 have active Starter subscriptions. Zero engagement. Likely credit card testing. Needs Stripe Radar or email verification before payment.

### Strategy Feature: 0 Adoption

Zero users have a `strategy` field populated. The AI's auto-learning feature has never triggered for anyone.

---

## Three Critical Problems Identified

### 1. Activation Wall: Account Connection

Half of paying subscribers never connected a social account. OAuth flow is intimidating for non-tech users, and it's optional/buried in a menu.

**Fix:** Force account connection as the first step after signup, before chat access.

### 2. Positioning Mismatch

Landing page says "Solo Founders & Indie Hackers", "300+ founders on autopilot". Real users are caterers, photographers, coaches. They don't identify as "founders."

**Fix:** Rewrite landing page with real-world business examples. Lead with Instagram/Facebook, not "9 platforms." Show niches like: photographer, restaurant, coach, consultant.

### 3. Users Don't Know What to Post

Current value prop assumes users arrive with content ideas ("one idea → 9 platforms"). Real users need the AI to TELL them what to post.

**Fix:** Make the AI proactive — "Here are 5 post ideas for your week" on first interaction, based on their niche. This is where "manager" becomes real.

---

## Strategic Direction

- **Target:** Non-tech small business owners (service businesses, local businesses, creative professionals)
- **Core need:** "Tell me what to post and post it for me"
- **Key platforms:** Instagram first, Facebook second, LinkedIn for B2B services
- **Pricing:** Consider simplifying to 1-2 plans
- **Voice:** Speak their language, not startup jargon
- **Activation:** Account connection must be mandatory and early in the flow

## Work Streams

**Axe 1 — Activation & Retention (technical):**
- Force account connection at signup
- First AI message should generate a concrete post for their business
- Investigate strategy feature (0 adoption)
- Fix fraud (Stripe Radar)

**Axe 2 — Repositionnement (landing & messaging):**
- Rewrite landing for small business owners
- Show real examples (photographer, coach, restaurant)
- Lead with Instagram/Facebook
- Simplify pricing

---

## Action Plan (April 23, 2026)

Priority-ordered based on analysis review. Sequenced so each step amplifies the next.

- [ ] **1. Talk to the 6 power users this week** — DM Adontai, Casa Lasagna, Stefan, Brandon, Fabienne, Paul. Ask: "Why do you use PostClaw?" and "What almost made you leave?" Qualitative data is the biggest gap right now.
- [ ] **2. Reposition the landing page** — Rewrite for small business owners BEFORE any technical work. Current "Solo Founders & Indie Hackers" messaging attracts the wrong audience. Lead with Instagram/Facebook, not "9 platforms." Show niches: photographer, restaurant, coach.
- [ ] **3. Force account connection in onboarding** — The single biggest technical lever. 90% drop before core value. Move connection to the first step after signup, before chat access.
- [ ] **4. Make the AI proactive on first interaction** — First message should be "Here are 5 post ideas for your week" based on their niche. This is the shift from distribution tool to content strategy tool.
- [ ] **5. Kill the fraud** — 13 fake Starter subscriptions (~15-20% of revenue). Add Stripe Radar or email verification before payment. Pollutes every metric until fixed.
- [ ] **6. Reach out to the 23 paying-but-not-connected users** — They will churn within 1-2 billing cycles. Personal outreach to help them connect (feasible at this scale) or accept the revenue drop and plan accordingly.
