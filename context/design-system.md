# PostClaw Design System

## Aesthetic Direction

Dark, techy, OpenClaw-adjacent. Inspired by OpenClaw's brand identity — dark navy backgrounds, coral accents, subtle starfield dots, and bold sans-serif typography. The feel is modern developer-tool meets creator product. Visually aligned with the OpenClaw ecosystem to ride brand recognition.

The landing page uses a scoped `.dark-theme` class (on the `(home)` layout) that overrides Tailwind theme CSS variables. The dashboard retains its own light content area with dark sidebar.

---

## Typography

Single font throughout — no serif headings.

| Role | Font | Tailwind Class | Usage |
|------|------|----------------|-------|
| **Everything** | DM Sans | `font-sans` (default) | Headings, body, buttons, nav, labels |

`--font-serif` is aliased to DM Sans in `@theme` so any legacy `font-serif` class renders DM Sans.

### Heading scale

- **h1** (hero): `text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.1] tracking-tight text-white`
- **h2** (sections): `text-4xl md:text-5xl font-bold text-white`
- **h3** (cards/features): `text-xl md:text-2xl font-semibold text-white`
- **Body text**: `text-[0.95rem] leading-relaxed` or `text-lg md:text-xl leading-relaxed`
- **Small text**: `text-sm text-[#7a7f94]`

---

## Color Palette

### Theme architecture

Colors are defined in `globals.css` using `@theme` (not `@theme inline` — we need CSS custom properties so `.dark-theme` can override them).

- **Light theme** (default, used by dashboard): oklch values in `@theme`
- **Dark theme** (landing pages): hex overrides in `.dark-theme` class

### Landing page colors (dark theme)

| Element | Hex | Usage |
|---------|-----|-------|
| Background | `#0d0f17` | Page background |
| Card / Surface | `#151929` | Cards, panels, sections |
| Card inner | `#111320` | Slightly lighter nested cards (e.g. HowItWorks outer) |
| Border | `#1e2233` | Card borders, dividers |
| Primary / Accent | `#e8614d` | CTAs, links, highlights, OpenClaw brand color |
| Primary hover | `#d4563f` | Button hover state |
| Text (primary) | `#ffffff` / `text-white` | Headings, names, emphasis |
| Text (body) | `#e8e9f0` | General body text |
| Text (secondary) | `#c0c4d0` | Quotes, lighter body |
| Text (muted) | `#7a7f94` | Labels, captions, muted info |
| Text (dim) | `#555a6b` | Strikethroughs, disclaimers |

### Dashboard colors (light theme — unchanged)

| Element | Value | Usage |
|---------|-------|-------|
| Content area | `bg-[#f8f9fc]` | Main dashboard background |
| Cards | `bg-white` | Dashboard cards |
| Text | `text-gray-900` | Primary dashboard text |
| Muted text | `text-gray-500` | Secondary dashboard text |
| Borders | `border-gray-100` | Card borders |

### Sidebar colors (CSS variables in `:root`)

| Variable | Value | Usage |
|----------|-------|-------|
| `--sidebar-bg` | `#151929` | Sidebar background |
| `--sidebar-bg-hover` | `#1c2035` | Nav item hover |
| `--sidebar-bg-active` | `#252a3a` | Active nav item (behind coral) |
| `--sidebar-text` | `#7a7f94` | Inactive nav text |
| `--sidebar-text-active` | `#ffffff` | Active nav text |
| `--sidebar-accent` | `#e8614d` | Active nav background, avatar bg |
| `--sidebar-border` | `#1e2233` | Divider lines |
| `--sidebar-user-bg` | `#1a1d2e` | User section background |

---

## Backgrounds & Gradients

### Hero dark glow (`.hero-dark-glow`)

Warm coral radial gradient from the top of the hero section:

```css
background:
  radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232, 97, 77, 0.15) 0%, transparent 60%),
  radial-gradient(ellipse 40% 30% at 85% 15%, rgba(232, 97, 77, 0.08) 0%, transparent 50%),
  var(--color-background);
```

### Starfield (`.starfield`)

Subtle repeating dot pattern using CSS `radial-gradient` layers on a `::before` pseudo-element. Dots are 1-1.5px, white at 6-20% opacity, tiling at `500px x 350px`. Children need `position: relative; z-index: 1` (applied via `.starfield > *`).

### Final CTA gradient

Dark gradient with subtle coral border:
```
bg-gradient-to-br from-[#1a1020] to-[#0d0f17] border border-[#e8614d]/20
```

---

## Buttons

All buttons use **pill shape** (`rounded-full`) globally.

### Sizes

| Size | Class | Specs |
|------|-------|-------|
| Default | `size="default"` | `h-10 px-5 py-2` |
| Small | `size="sm"` | `h-9 px-4` |
| Large | `size="lg"` | `h-12 px-8` |
| CTA (custom) | `size="lg"` + `className="h-14 px-10 text-base"` | Tall pill for hero/section CTAs |

### Landing page buttons

All CTAs on the landing page use explicit coral colors (not theme `bg-primary`) for clarity:

```
bg-[#e8614d] hover:bg-[#d4563f] text-white
```

### Dashboard buttons

Dashboard buttons use a mix of theme `bg-primary` (purple on light theme) and hardcoded coral `bg-[#e8614d]` for specific actions.

---

## Border Radius

| Element | Radius |
|---------|--------|
| Buttons | `rounded-full` (pill) |
| Cards (standard) | `rounded-2xl` |
| Cards (large/sections) | `rounded-3xl` or `rounded-[2rem]` |
| Icon containers | `rounded-xl` |
| Badges/pills | `rounded-full` |

---

## Spacing

Generous whitespace throughout.

| Element | Padding |
|---------|---------|
| Section vertical | `py-20 md:py-28` |
| Container horizontal | `px-6` |
| Card inner | `p-8` to `p-10` |
| Section containers | `p-10 md:p-16` or `p-12 md:p-20` |
| Between section heading and content | `mb-14` to `mb-20` |

---

## Cards (Landing Page)

Dark cards with subtle borders. No shadows (they don't work on dark backgrounds).

```
bg-[#151929] border border-[#1e2233] rounded-2xl p-8
```

Hover state for interactive cards:
```
hover:border-[#e8614d]/20 transition-colors
```

Feature cards include a coral icon container:
```
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8614d]/10">
  <Icon className="h-5 w-5 text-[#e8614d]" />
</div>
```

---

## Layout Patterns

### Hero
- Left-aligned text (not centered)
- Max width `max-w-xl` on text block (`lg:max-w-xl`)
- Full viewport height feel: `min-h-[85vh] flex items-center`
- Dark glow + starfield background
- "OpenClaw" highlighted in coral in the headline
- "Powered by OpenClaw" pill badge below CTA

### Section headings
- Bold sans-serif, `text-white`, centered
- Multi-line with `<br />` for intentional line breaks
- Generous bottom margin (`mb-14` to `mb-20`)

### Feature columns
- 3-column grid: `grid grid-cols-1 md:grid-cols-3 gap-8`
- Dark cards with icon, heading, description
- Coral icon accent on each card

### Dark card sections (HowItWorks)
- Outer: `rounded-[2rem] border border-[#1e2233] bg-[#111320] p-10 md:p-16`
- Inner items: `bg-[#151929] border border-[#1e2233] rounded-2xl px-6 py-5`
- 2-column grid for items: `grid grid-cols-1 md:grid-cols-2 gap-4`

### Testimonial cards
- Dark cards: `bg-[#151929] border border-[#1e2233] rounded-2xl p-8`
- Quote text in `text-[#c0c4d0]`, name in `text-white`, role in `text-[#7a7f94]`

### Stats grid
- 2x4 grid of dark cards with coral values
- Value: `text-3xl md:text-4xl font-bold text-[#e8614d]`
- Label: `text-sm text-[#7a7f94] font-medium`

---

## Navbar

- Dark transparent: `bg-[#0d0f17]/80 backdrop-blur-md border-b border-[#1e2233]/50`
- Height: `h-20`
- Logo: `text-2xl font-bold text-white hover:text-[#e8614d]`
- CTA button (logged out): coral pill `bg-[#e8614d] hover:bg-[#d4563f]`
- Avatar (logged in): `h-9 w-9` with `border-2 border-[#e8614d]/30`
- Dropdown: `bg-[#151929] border-[#1e2233]`

---

## Footer

- Dark background: `bg-[#0a0c14] border-t border-[#1e2233]`
- Brand name: `text-lg font-semibold text-white`
- Links: `text-[#7a7f94] hover:text-[#e8614d]`
- Copyright: `text-sm text-[#7a7f94]`

---

## FAQ Accordion

- Native `<details>/<summary>` elements (no JS dependency)
- Dark card: `bg-[#151929] border border-[#1e2233] rounded-2xl p-6`
- Summary text: `text-[#e8e9f0]`
- Answer text: `text-[#7a7f94]`
- Chevron: `text-[#555a6b]`, rotates 180deg on `details[open]`

---

## Animations

Using `framer-motion` via `AnimatedSection` wrapper component.

- Scroll-triggered fade-in-up: `opacity: 0 → 1`, `y: 30 → 0`
- `once: true` — triggers only on first viewport entry
- Staggered delays: items use `delay={index * 0.1}` to `delay={index * 0.15}`
- Duration: `0.5s` ease-out
- Viewport margin: `-100px` (triggers slightly before element enters view)

---

## Key Rules

1. **DM Sans everywhere** — no serif fonts, single typeface
2. **Dark cards with borders** — `bg-[#151929] border border-[#1e2233]`, no shadows on dark
3. **Coral `#e8614d` is the accent** — CTAs, highlights, icons, hover states, OpenClaw branding
4. **Pill buttons everywhere** — never use `rounded-md` on buttons
5. **Generous spacing** — when in doubt, add more whitespace
6. **OpenClaw brand alignment** — dark backgrounds, coral accents, starfield dots, techy vibe
7. **Scoped dark theme** — `.dark-theme` class on `(home)` layout only; dashboard stays light
8. **Use `@theme` not `@theme inline`** — CSS custom properties must cascade for `.dark-theme` overrides
