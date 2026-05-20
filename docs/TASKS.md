# TASKS

Single source of truth for what's queued. Three buckets — `Now` is what we're actively working, `Next` is the next pull, `Backlog` is everything else. Keep entries to one line + a short "why". Move items down (or delete) as they ship. Detailed specs live in `chat-future-ideation-fr.md`.

Legend: `[chat]` chat surface · `[ui]` dashboard UI · `[infra]` plumbing · `[ship]` shipped (kept short for memory, prune monthly)

---

## Now

- make system prompt proactive and ask question when to be sure to make what users want
- ai chat should know if account are disconnect etc he should know about global account health
- when a analysis is running, we should have an alert on the dashboard, like a loader or something like that that tell the user "we are analysis you social account"

## Next

- [ ] **Carousel photo reorder + lightbox preview** `[ui]` — Drag-to-reorder media on a draft + tap-to-zoom for full-size preview.
- [ ] **Save preferences (memory)** `[chat]` — Feature 8. `save_preference` / `forget_preference` tools writing to `User.knowledgeBase.preferences[]`, surfaced + editable in `/d/business`. → Feature 8

## Backlog

- [ ] **Weekly digest — agent initiates** `[chat][infra]` — Feature 4. Sunday cron generates 5 drafts, emails the user a deep link. Requires per-user timezone-aware Inngest schedule.
- [ ] **Remix top posts** `[chat]` — Feature 9. `remix_top_posts` tool seeded by `Insights.zernio.topPosts`. Day-30 feature (needs ≥10 published posts). Beware planner-first framing — keep it photo/event/winner-driven.
- [ ] **Reels from photos** `[chat][infra]` — Feature 6. Cloudinary video transform + `make_short_video` tool; brand-color text overlays driven by voice fingerprint. Gated on render cost <€0.30/Reel.
- [ ] **WhatsApp / Telegram inbound** `[chat][infra]` — Feature 7. Contrarian bet — capture surface where SMBs actually live. Start Telegram (no business approval), graduate to WhatsApp. Whisper transcript → existing `/api/chat` pipeline.

---

## Recently shipped (last 30 days)

- `[ship]` 2026-04-30 — "Add a post" per column on the kanban (one-shot composer modal: textarea + media + char counter; new `POST /api/suggestions`; columns now always render per connected account)
- `[ship]` 2026-04-30 — Image input in chat (paperclip + Cloudinary upload in `ChatPanel`; Sonnet 4.6 vision on user message; pre-populated `mediaItems` on generated drafts)
- `[ship]` 2026-04-30 — TikTok photo carousel support (`platformConfig` flip + `mediaValidation` cleanup; up to 35 images per post)
- `[ship]` 2026-04-30 — Inline caption edit on draft cards (debounced autosave + dirty guard + flush registry); pencil → Rewrite dropdown; `EditSuggestionModal` removed
- `[ship]` 2026-04-30 — Reschedule scheduled posts from `ChannelPage` via `SchedulePicker`; removed orphan `/d/posts` route + `ContentList`
- `[ship]` 2026-04-29 — `publish_drafts` + `schedule_drafts` (Feature 3)
- `[ship]` 2026-04-29 — `OutcomeSnapshot` cron + system-prompt injection (Feature 5, rearchitected — no tool)
- `[ship]` 2026-04-29 — Pre-flight `validatePost` auto-baked into commit path (Feature 10)
