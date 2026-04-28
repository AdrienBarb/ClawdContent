# Product Requirements Document: PostClaw

## Product Vision

**Problem Statement**
Small business owners — caterers, photographers, coaches, local services — know they should post on social media but don't know what to post or how often. Their last post got 3 likes, and the blank composer feels paralyzing. They can't afford a $2K/mo agency or a marketing hire.

**Solution**
PostClaw analyzes their business and their existing social accounts, then generates a week of ready-to-publish posts from a single sentence. Cross-platform by default, one-click schedule. The system learns from what works on each account and improves recommendations over time.

**Success Criteria**
- $5K MRR by October 2026 (~100 paying customers at $49/mo)
- Free-to-paid conversion rate (primary north-star metric)
- Activated users return 4+ times per month

## Target Users

### Primary Persona: The Caterer (and similar small business owners)
- **Role**: Owner-operator of a small local business — caterer, wedding photographer, fitness coach, hair salon, artisan shop. Does the work *and* runs the business.
- **Pain Points**:
  - Just finished an event/shoot/session and has no idea what to post about it
  - Doesn't know how often to post or what cadence works
  - Last post got 3 likes — feels invisible and discouraged
  - No time to learn Buffer/Hootsuite or write captions from scratch
  - Tried marketing agencies, can't justify $2K+/mo
- **Motivations**: Wants more bookings, more local visibility, to look professional online without becoming a marketer.
- **Goals**: Show up consistently on social media without thinking about it.
- **Churn risk**: Any friction or complexity. The product must be dead simple — if they hit a confusing screen in week 1, they're gone.

## Core Features (MVP)

### Must-Have Features

#### 1. Generate a Week of Posts from One Sentence
**Description**: User types a single sentence ("we catered a wedding for 80 guests last weekend") and PostClaw produces a full week of platform-ready posts — captions, hashtags, formatting tuned per platform.
**User Value**: Removes the "what do I post?" paralysis entirely. The blank composer becomes a one-line brief.
**Success Metric**: % of new users who generate their first batch within 24h of signup.

#### 2. Cross-Posting Across Connected Accounts
**Description**: One generation produces variants for every connected platform (Instagram, Facebook, TikTok, etc.) — adapted to each platform's format and best practices, not a copy-paste.
**User Value**: One brief, full week of presence everywhere. No re-writing per platform.
**Success Metric**: Average number of platforms posts are published to per user.

#### 3. One-Click Schedule & Publish
**Description**: From the drafts board, user reviews each post and either publishes immediately or schedules it. No multi-step wizard, no separate scheduling UI.
**User Value**: Review-and-ship in seconds. Matches the "I have 5 minutes between events" reality of the persona.
**Success Metric**: Activation = user publishes or schedules their first post. Track time-from-signup-to-activation.

#### 4. Learns From What Works
**Description**: PostClaw tracks performance of published posts (engagement, reach) per account and feeds that back into future generations — favoring formats, topics, and tones that perform on *that specific* account.
**User Value**: The product gets better the longer they use it. Justifies retention and the subscription price.
**Success Metric**: Generation quality score / engagement uplift on posts after week 4 vs. week 1.

### Should-Have Features (Post-MVP)
- **Fully autonomous publishing**: PostClaw posts without user approval (currently requires user click).
- **Comment & DM replies**: AI-assisted inbox management.
- **Team seats**: Multi-user accounts for businesses with assistants or partners.
- **Analytics dashboard**: Deeper performance reporting beyond the learning loop.
- **Video generation / editing**: Currently only captions + media reuse.
- **A/B testing of post variants**

## User Flows

### Primary User Journey
1. Sign up with email or Google → onboarding asks for website URL or business description.
2. PostClaw extracts brand knowledge from the site/description; user validates in one screen.
3. User connects their first social account (free, no paywall).
4. PostClaw analyzes the connected account for tone, audience, top-performing posts.
5. On `/d`, user types one sentence in the chat: "we catered a wedding last weekend."
6. PostClaw generates a week of posts on the drafts board (cross-platform variants).
7. User reviews, edits if needed, clicks **Schedule** or **Post Now** on each card.
8. Posts publish via Zernio. PostClaw tracks performance and uses it to improve the next batch.
9. After ~3 successful generations, paywall: $49/mo for unlimited use.

## Out of Scope (v1)

Explicitly **NOT** building in MVP:
- **Fully autonomous publishing** — every post requires a user click to schedule or publish.
- **Team seats / multi-user accounts** — single owner per workspace.
- **Comment / DM management** — no inbox, no auto-replies.
- **Video generation or in-app editing** — uses uploaded media only.
- **Public analytics dashboard** — performance feeds the learning loop, not a UI.
- **Custom AI voice training UI** — voice is inferred from website + connected accounts, no manual tuning.

## Open Questions
- What is the right free tier limit before paywall — number of generations? Number of published posts? Time-based?
- How many days/posts of performance data are needed before the learning loop produces meaningfully better output?
- Is the activation moment "first post scheduled" strong enough to predict paid conversion, or should we measure "first post *published*" (committed, not scheduled)?
- Cross-posting: do users want all variants by default, or pick platforms per generation?

## Success Metrics

**Primary Metrics**:
- **MRR**: $5,000 by October 2026 (~100 customers at $49/mo).
- **Free → paid conversion rate**: north-star — to be baselined in first 4 weeks post-launch.
- **Activation rate**: % of signups who publish or schedule a post within 7 days.

**Secondary Metrics**:
- **Returning user rate**: % of activated users returning 4+ times per month.
- **Time-to-first-post**: median minutes from signup to first scheduled/published post.
- **Generation → publish rate**: % of generated posts that actually ship.

## Timeline & Milestones
- **Today**: 2026-04-28
- **MVP feature-complete**: target ~6 weeks (mid-June 2026)
- **First user testing with real caterers/photographers**: late June 2026
- **Public launch**: July 2026
- **$5K MRR target**: October 2026
