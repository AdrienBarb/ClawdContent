# PostClaw Audit — 2026-05-18

## 1. Verdict

You sold a manager and built a draft generator. 48 signups across 3 weeks, zero paid conversions, zero published posts. The product is failing the one job it was hired for, and you already knew the answer on April 22 (SMBs engage, founders/creators churn) and overrode it eight days later — so the real bug is in the decision-making, not the code.

## 2. The Core Diagnosis

**(e) — building the wrong product for a real problem, with a side of (b) PMF signal in wrong segment that you actively walked away from.**

Evidence:
- 0 publishes from 11 users with drafts this week. Same 0% last week. Same 0% the week before. Drafts→publish is a flat line at zero across 4 cohorts of "drafted" users. That's not a leak, it's a wall. The product does not complete the job.
- Your headline promise is "Tell me what to post and post it for me." Your runtime asks users to click Post on a card in `SuggestionsBoard`. The chat tool `set_schedule` *stages* a time, then waits for a human click. You sell autopilot, you ship copilot. Users notice.
- April 22 PMF analysis: SMBs retain, founders/creators churn. April 30: re-broadened to 3 ICPs. You had a signal, you overrode it on vibes, and 18 days later the data is screaming back: still 0% paid, still SMB-skewed (87% this week), still 0% publish. The market is reproducing your April 22 finding for the third time.
- 15 follow-up emails sent May 7 to stuck users. Zero replies. People aren't even pissed enough to complain. They forgot you exist. [Framework: a16z — engagement, not acquisition, is the truth-teller. Yours is dead.]

## 3. Framework-by-Framework Teardown

**JTBD**
- The hired job is "make the social media problem disappear." Not "help me write posts faster" — that's a tool job, not a manager job, and your homepage explicitly rejects tool framing.
- Who hires you: the SMB owner (photographer, caterer, CDL school, low-voltage contractor in WNC, candle studio). The data confirms it — your top engaged free user three weeks running fits this profile.
- What you're firing: an unpaid intern, a freelancer at $300/mo, or doing nothing (the default).
- Is the job painful enough at $49/mo? Yes — Logan at NCI and Ruben at WISE CDL each pay >$49/mo in implicit time-cost for one missed Instagram post. The job is worth $49. **You're just not doing it.**

**Sean Ellis PMF**
- You can't run the survey because you have zero customers. Run it on the 4 users who *generated drafts but didn't publish* and you'd score ~10% "very disappointed" — well below the 40% line.
- The cohort that would score highest if you actually shipped the product: SMB owners with one platform (Instagram or Facebook), not 9. The cohort dragging you down: the founder/creator tourists who try the chat once and bounce. [Framework: Sean Ellis — below 40%, stop scaling. You haven't started scaling, so the directive is: stop *broadening* and re-narrow.]

**a16z Value Hypothesis**
- Not proven. The single engagement metric that would prove it = **posts published per user in week 2**. Yours: 0. For 3 weeks running.
- Drafts generated is a vanity metric. Drafts are noise until they become a published post on someone's actual Instagram. You're measuring the artist's sketches; the customer wants the painting on their wall.
- Brad Upton (Cambridge Heartwear, 6 drafts, 0 published, no sub) is the case study. Highest-intent user you've seen. Generated 6 drafts. Published 0. Did not pay. That's not him — that's you.

**Thiel Monopoly**
- Your secret: SMB owners would happily pay someone to *just do this for them* and don't want a dashboard. That's real and contrarian.
- 10x dimension claimed: "no dashboard, no editor, no learning curve." But the product still routes through `/d` with a chat composer, a drafts board, edit affordances, and a `PostCard` they have to click. You ship the dashboard you said you weren't.
- Where you're 10% better on 5 dimensions: 9 platforms (Buffer has 9 too), AI captions (Hootsuite has it, Buffer has it, Later has it), scheduling (everyone has it). Death by feature parity.
- The monopoly play: "we publish your posts automatically and you never see a dashboard, $49/mo." Nobody credible offers that today because nobody trusts AI to autopublish. **That trust gap is your moat if you build for it.** [Framework: Thiel — last mover in the niche "autopublish for non-technical SMBs" beats first mover in the broad "AI social tool" category.]

**Sequoia Memo — weakest slide**
- "Solution" is the weakest. Problem is clear (SMBs are too busy for social). Why now is fine (AI good enough). Market is huge. Business model is reasonable. But the **solution doesn't solve the problem** — you describe a manager, ship a copilot. Every other slide gets dragged down by this.

**Reforge Growth Loop**
- No loop today. You have a blog (Sanity), alternatives pages, and onboarding via website-URL scrape (Firecrawl). None of these compound.
- Closest candidate: **published-post → public proof → SEO/screenshot/referral**. If your users actually published, you'd have N×weekly real posts shipped from real businesses you could case-study, screenshot, and turn into "PostClaw posted this for [Business] last week" content. **You can't run this loop until you fix the publish wall.** [Framework: Reforge — loops require an *output* the system can re-ingest. Your output is "drafts in a dashboard," which doesn't loop.]

## 4. Diagnostic Areas

**Positioning**
April Dunford: alternative being replaced = "hiring a freelancer, asking my niece, or nothing." Unique value = "the only one that actually posts for you without you logging in." Who it's for = "small business owners, especially photographers/caterers/coaches/local services with 1 or 2 platforms." Today's positioning straddles 3 ICPs and 9 platforms, which means it's positioned at nobody. **Verdict: scrap and rewrite around SMB + Instagram/Facebook + autopublish.**

**Pricing**
$49/mo isn't too high or too low — it's irrelevant because nobody pays. Willingness-to-pay signal in the data: 0 active subs in the cohort, 0 in the prior 2 cohorts. You can't price what you haven't proven. Once the product publishes, $49/mo is *underpriced* for SMB (they pay freelancers $300+). **Verdict: don't touch pricing until publish rate is non-zero. Then raise to $79 or $99 for the "we post for you" plan, keep a $19 "review first" tier if you must.**

**ICP focus**
You have 3 segments by intention and 1 by data. SMBs are 87% of classifiable signups this week, 92% prior, 86% before that. Founders and creators are tourists; they sign up, generate a draft, leave. SMBs sign up, onboard, connect, generate drafts, then hit the publish wall. **Verdict: fire founders and creators publicly. Rewrite the homepage to say "for small business owners." Lose the "Who it's for" three-segment section. You already know — your April 22 analysis told you. Trust it this time.** [Framework: Thiel + JTBD — SMB has the painful job and no incumbent. Founders have Buffer/Typefully. Creators are the job.]

**Onboarding**
75% complete onboarding (decent). The leak is post-onboarding: only 5 of 11 connect a social account, only 4 of 5 generate drafts, 0 of 4 publish. The "aha" moment is supposed to be "I have a week of posts ready and they went live." Users hit "I have 5 drafts in a board I have to review" — which is the *anti-aha* for an SMB owner. Cut the chat composer for first-time users. Cut the drafts board for first-time users. **Verdict: rebuild onboarding so the user signs up → connects ONE platform (Instagram only) → gets 3 posts auto-scheduled for next week without seeing a single editor. If they want to edit, the option is there. By default: it ships.** [Framework: Reforge activation — the activation event has to match the long-term retention behavior. Your retention behavior is "platform posts on your behalf." Your activation event should be that.]

**Activation**
Define activation as "1 post published to the user's actual social account within 48h of signup." Current rate: 0%. The product is not engineered to deliver this. The whole flow assumes the user wants to review. The SMB you're targeting *does not want to review*. **Verdict: redefine activation, then re-engineer the flow backwards from it. Default: auto-publish, opt-in to review.** [Framework: Reforge — activation event predicts D28 retention. Yours doesn't exist yet.]

**Retention**
You don't have a cohort curve because you don't have customers. The closest proxy is "drafts→publish" which is 0% for 3 consecutive weekly cohorts. That's a curve that hits zero on day 1 and stays there. Leading indicator of churn is already visible: stuck-at-drafted users go silent (0/15 replied to your follow-ups). **Verdict: there's no retention to measure until there's activation to measure.** [Framework: a16z — cohort retention is the only honest metric. Yours is flatlining at 0%.]

**Distribution**
No loop today. The right loop for SMB + autopublish: **"PostClaw published this post for [Business]" SEO/social proof loop.** Every published post becomes a public artifact that links back. Every business that publishes becomes a logo/quote/case study. This compounds only if you fix publish first. Secondary loop: location-based programmatic SEO ("social media manager for [city] caterers/photographers/[trade]"). You're already running an "alternatives" content track in Sanity — extend it into vertical-by-city pages. **Verdict: one loop, post-fix. Don't try to ship distribution before fixing the publish wall — you'll just light cash on fire.** [Framework: Reforge — loops require working product output. Yours doesn't exist yet.]

## 5. The Pivot/Fix Plan

### Week 1–2 — Kill list

- **Kill the "Who it's for" homepage section listing 3 segments.** Why: dilutes positioning, contradicts data, scared off the segment that actually retains. Metric: SMB share of new signups (target 90%+). [Framework: April Dunford / Thiel.]
- **Kill the chat composer in the first-time user flow.** Why: it's an editor surface, you said no editor. Metric: time-to-first-draft (target <60s, no chat needed). [Framework: Reforge activation.]
- **Kill 7 of 9 platforms from the connect UI for new users. Keep Instagram + Facebook.** Why: 90%+ of SMB users only post on these two. The 9-platform breadth is founder bait. Metric: % of new users connecting Instagram or Facebook within 24h (target 70%+). [Framework: JTBD — match the job, not the brochure.]
- **Kill the "AI social media manager" framing in copy. Replace with "we post for you."** Why: "manager" is abstract; "we post for you" is concrete. Metric: landing→signup conversion (track weekly). [Framework: April Dunford.]
- **Stop generating new content for founders and creators. Pause LinkedIn/IH posts targeted at those segments.** Why: you're attracting the wrong cohort and hurting your own analytics. Metric: signup ICP mix. [Framework: Thiel — niche domination.]

### Week 3–4 — Narrow

- **Rewrite homepage H1: "We run your Instagram and Facebook for you. No dashboard. No drafts to review. $49/mo."** Why: this is what SMBs would actually pay for, and what no incumbent delivers. Metric: homepage→signup CR (baseline now, +50% target). [Framework: Dunford positioning.]
- **Rewrite onboarding to: "What's your business?" → URL or 1-sentence description → "We'll post 3 times this week, here's the plan, hit go" (no draft review screen).** Why: deliver the promise on the first session. Metric: % new users with 1 published post within 48h (target 30%+ on week 1, then iterate). [Framework: Reforge — activation event matches retention behavior.]
- **Keep pricing at $49/mo for now. Add a "$99/mo concierge" tier for users who want a human to approve before posting. This becomes your white-glove research channel.** Why: high-touch tier lets you talk to 5–10 users/week with skin in the game. Metric: # concierge customers, # interviews/week. [Framework: YC — talk to users, but make them pay first.]

### Week 5–8 — Rebuild

- **Build auto-publish-by-default. Add a 2-hour "review window" where users can cancel a queued post. After 2h, it ships.** Why: respect users who don't want to review, give a safety net for the nervous ones. Metric: % of queued posts that actually publish (target 80%+). [Framework: JTBD — finish the job.]
- **Interview these 10 users this month, in this order**: (1) Brad Upton, Cambridge Heartwear — your highest-engaged free user, ask why he generated 6 drafts and shipped 0. (2) Logan Gillespie, NCI low-voltage WNC — drafted_no_publish, classic SMB. (3) Ruben Sanchez, WISE CDL — onboarded_no_connect, why did connect feel scary? (4) Federica Di Biagio, Italian finance Instagram page — drafted_no_publish, creator-leaning but engaged. (5) suki.candle.studio — top engaged free user 2 weeks running, never paid. (6–10) Pick 5 SMB owners from the historical cohort who are >30 days old and have *any* drafts. Question: "If we just posted for you automatically, would you trust it? What would make you trust it?" Disqualifier: anyone who says "I'd want to review every post" — they are not your ICP. [Framework: YC Mom Test — watch what they DO, not what they say they want.]
- **Build a public "what PostClaw posted this week" page that aggregates published posts (opt-in) into a public feed.** Why: this becomes the artifact for the distribution loop. Metric: # of users opted in to public feed. [Framework: Reforge growth loop — loops need an artifact.]

### Week 9–12 — Distribute

- **Loop 1: vertical+city programmatic SEO.** Ship 200 pages: "social media management for [city] [vertical]" — start with photographers, caterers, coaches, and CDL/trade schools in the top 50 US metros. Why: SMB owners Google "[city] social media help" not "AI social tool." Metric: organic signups from vertical+city pages (target 5/week by month 3). [Framework: Reforge / programmatic SEO.]
- **Loop 2: "we posted this for [Business]" social proof.** Once auto-publish is real, every published post becomes a tweet/LinkedIn post you publish: "PostClaw posted this for @CambridgeHeartwear last Tuesday — they spent zero minutes on Instagram this week." Why: turns product output into acquisition. Metric: signups attributed to social proof posts. [Framework: Reforge — output becomes input.]
- **Loop 3: founder-led DMs to 10 SMB owners/week.** Manual, doesn't scale, but unblocks PMF detection. Why: April 22 already told you SMBs engage. Now go find them. Metric: # interviews scheduled, # paid concierge customers. [Framework: YC — do things that don't scale.]

## 6. The Single Bet

**Ship auto-publish-by-default in the next 30 days, even if it's ugly.** Default behavior: user signs up, picks Instagram, gets 3 posts queued for the next 7 days, posts ship automatically unless they hit cancel within 2 hours of scheduled time. No draft board for new users. No chat. No 9-platform picker. Just: we post for you. This is the only product motion that matches the homepage promise, the only one that completes the JTBD, and the only one that turns engagement (0% publish today) into the metric that proves value (publishes per user per week). Everything else — pricing, positioning, ICP narrowing, distribution loops — depends on this working. If you ship one thing this quarter, ship this. I'd bet $20k of my own money that publish-rate-per-user is the only number that moves the conversion needle. [Framework: a16z value hypothesis — until you prove people use it, nothing else matters.]

## 7. What I'd Need to See Next

1. **Cohort retention curve for the SMB segment only**, week-over-week, for the last 60 days. Specifically: of the SMB users who connected a social account, how many were still active (any draft generated, edited, or scheduled) at D7, D14, D28? Without this, I'm guessing about how steep the leak is post-connect.
2. **Recordings or transcripts from the 5 user interviews I listed above.** Specifically Brad Upton, Logan Gillespie, Federica Di Biagio, suki.candle.studio, and one fresh ghost. Watch for the moment they describe the *current* workaround — that's the JTBD competitor.
3. **A/B test: auto-publish-by-default vs review-first, on a 20-user pilot.** Measure: % users with ≥1 published post by D7. Hypothesis: auto-publish wins by 5x or more. If it doesn't, my whole audit is wrong and we need to talk.
4. **Conversion attribution for any users you've ever paid.** I don't have visibility into pre-April 30 paid customers. Were any of them SMBs? Which ICP converted historically? If you've had any paid SMBs ever, that's the goldmine cohort.
5. **The exact wording of the "Tell me what to post and post it for me" promise vs what the user experiences in their first session.** Screenshot-by-screenshot. I want to see the moment expectation breaks. That's the leak.

---

You knew this on April 22. The data has been screaming it back for 4 weeks straight. Stop hedging on the ICP. Ship the autopublish. Charge the SMBs. Fire everyone else. [Framework: Thiel — *what important truth do very few people agree with you on?* You wrote the answer on April 22 and then disagreed with yourself. Agree with yourself.]
