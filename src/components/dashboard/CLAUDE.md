# Dashboard Design System

The tokens, components, and patterns the dashboard commits to. **Match these — don't reinvent.** Read `publish/ResultsView.tsx` first; it's the reference implementation.

## Surfaces & color

| Token | Value | Used for |
|---|---|---|
| Page background | `#faf9f5` | Dashboard `<main>` and topbar — warm off-white |
| Sidebar background | `#efedea` | Sidebar shell (one shade darker than page) |
| Surface | `#ffffff` | Cards, dropdowns, active nav, search inputs |
| Border | `border-gray-200` (`#e5e7eb`) | Cards, dividers, sticky topbar bottom |
| Hover wash | `bg-black/[0.035]` / `bg-black/[0.04]` | Nav items, ghost buttons, account rows |
| Ink dark | `#2d2a25` | Bulk bar + toast |

The dashboard is **flat** — no floating white panel. Sidebar and main share the page; the only divider is the sidebar's right border.

## Coral accent — scarce, reserved for primary CTAs only

| Token | Value | Used for |
|---|---|---|
| Coral | `#ec6f5b` | Primary CTA gradient top, selected card border |
| Coral deep | `#c84a35` | Primary CTA gradient bottom |
| Coral soft | `#fef2f0` | Trash hover wash (only place coral touches destructive) |

**Coral is rare.** Only the actions a user must not miss earn it: the chat **Send** button, **Publish** / **Schedule** in `BulkBar`, and the **selected-draft** outline. Everything else — sidebar chrome, badges, decorative icons, empty-state ornaments, entry-card glyphs, usage meter, user avatar — uses neutral grays (`#6b7280`, `#9ca3af`, `gray-400`). When in doubt: gray. Adding coral to one more place dilutes every existing coral on the screen.

**Primary button:** `linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)` with `inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)`.

**Selection state:** `border-[#e8614d]` + `shadow-[0_0_0_1px_#e8614d,0_2px_6px_rgba(0,0,0,0.05)]`.

**Status colors (kanban only):** Approved → green pill, Scheduled → amber pill (dark amber text). Cards fade to a soft tint of the same hue. **Never use these outside post-state UI.**

## Typography

Both fonts loaded via `next/font/google` in `src/app/layout.tsx`:
- **Inter** → `--font-inter` / `--font-sans` / `--font-mono` — default UI text. Global `font-feature-settings: "ss01", "cv11"`.
- **Instrument Serif** (400, normal + italic) → `--font-instrument-serif` / `--font-serif` — accent/display copy only. Use Tailwind's `font-serif` class.

Numerics: always `tabular-nums` (e.g. `<span className="tabular-nums">{count}</span>`).

| Element | Class |
|---|---|
| Page title (`PageHeader`) | `text-2xl font-semibold tracking-tight text-gray-900` |
| Topbar title (kanban screens) | `text-[15px] font-semibold tracking-tight` |
| Section / column title | `text-sm font-semibold tracking-tight` |
| Body | `text-[13px] leading-relaxed` |
| Meta | `text-[11px] text-gray-500` / `text-[12px] text-gray-500` |
| Section eyebrow | `text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400` |

## Radii & shadows

- Page-level cards: `rounded-2xl` (16px) — posts, suggestion cards, billing/business panels
- Buttons, pills inside cards, nav items: `rounded-lg` (8px)
- Avatars: `rounded-[7px]` (24px) / `rounded-lg` (28px) / `rounded-[5px]` (small 18px)
- Filter pills, count badges: `rounded-full`
- Resting elevated surfaces: `shadow-sm` (active nav item, user row, count pills)
- Cards in `card-shadowed` variant: `shadow-md`
- Bulk bar: custom `0_12px_32px_rgba(0,0,0,0.20),_0_4px_8px_rgba(0,0,0,0.10)`

## Layout

- Page padding: `px-8 py-6` — supplied by `(dashboard)/layout.tsx`. **Don't re-pad inside individual pages.**
- Sidebar: fixed `md:w-64`. Mobile uses `Sheet`.
- Kanban screens (`ResultsView`) break out of page padding with `-mx-8 -my-6` and own a single `h-[100dvh]` scroll container so column headers can be `sticky top-0`.
- Kanban column min-width: `minmax(340px, 1fr)`. Horizontal scroll past 4 accounts — no overflow column.

## Component patterns

| Component | File | Notes |
|---|---|---|
| `PageHeader` | `PageHeader.tsx` | Standard page title + optional `right` slot. Used by posts, accounts, business, billing, media, settings. |
| Sidebar nav item | `Sidebar.tsx :: NavItem` | `rounded-lg`, active = white bg + `shadow-sm`. Ghost variant for Affiliates. Gray (`#9ca3af`) pill badge for counts — sidebar stays neutral. |
| Account row (sidebar) | `Sidebar.tsx` | 3px left stripe + 24×24 colored avatar + handle/platform stack. Active = white + `shadow-sm`. |
| Kanban reference | `publish/ResultsView.tsx` | The reference implementation — read first. |
| Post card | `ResultsView :: PostCard` | `rounded-2xl`, white, 3px account-color stripe absolute-left. `pb-3` body, footer `border-gray-100` + `bg-black/[0.005]`. Selected → coral border + ring. |
| Filter pill | `ResultsView :: FilterPill` | `rounded-full px-2.5 py-1 text-[12px]`. Active = white + `border-gray-200` + `shadow-sm`. Optional 6px platform-color dot. |
| Bulk bar | `ResultsView :: BulkBar` | `fixed left-1/2 bottom-6 -translate-x-1/2`, `bg-[#2d2a25]`, white text, animates in. Bulk Delete / Schedule / Post all. |
| Toast | `ResultsView` (local) | Same `bg-[#2d2a25]` palette as bulk bar. |
| Primary button | inline | Coral gradient as defined above. Disabled `opacity-50`. Spinner = `SpinnerGapIcon` from `@phosphor-icons/react`. |
| Icon button | inline | `h-8 w-8 rounded-lg text-gray-400 hover:bg-black/[0.05] hover:text-gray-700`. Trash variant: `hover:bg-[#fef2f0] hover:text-[#c84a35]`. |

## Account coding (cross-cutting)

Every place a post or account appears, use the platform's `color` from `src/lib/constants/platforms.tsx` for: 3px left stripe on cards, small avatar background, dot in filter pills, colored avatar in column headers. **This is what makes a multi-account view scannable — don't drop it for visual quietness.**

## Icons

`@phosphor-icons/react` everywhere new. `react-icons/si` + `react-icons/fa6` are kept only for brand glyphs in `platforms.tsx`. Don't introduce a third icon library.

## What to avoid

- New accent hues (purple/blue/teal). Coral is the only accent — and it's reserved for primary CTAs + selection.
- Coral on chrome (badges, sidebar, decorative icons, ornaments). Use neutral grays.
- The legacy "floating white panel on `#f3f3f1`" pattern. The dashboard is flat now.
- Coral on destructive actions. Delete buttons stay gray; only the *hover wash* uses `coral-soft`.
- New radii values. Stick to `rounded-lg`, `rounded-2xl`, `rounded-full`.
- Re-padding pages inside children — the layout owns `px-8 py-6`.
