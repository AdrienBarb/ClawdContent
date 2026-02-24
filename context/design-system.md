# PostClaw Design System

## Aesthetic Direction

Warm, editorial, premium. Inspired by modern editorial sites — serif display headings paired with clean sans-serif body text. The overall feel is approachable yet refined, with generous whitespace, soft warm tones, and no hard borders.

---

## Typography

| Role | Font | Tailwind Class | Usage |
|------|------|----------------|-------|
| **Display / Headings** | Playfair Display | `font-serif` | h1, h2, h3, logo, pricing numbers |
| **Body / UI** | DM Sans | `font-sans` (default) | Paragraphs, buttons, nav, labels, inputs |

### Heading scale

- **h1** (hero): `font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.1] tracking-tight`
- **h2** (sections): `font-serif text-4xl md:text-5xl font-bold`
- **h3** (cards/features): `font-serif text-xl md:text-2xl font-semibold`
- **Body text**: `text-[0.95rem] leading-relaxed` or `text-lg md:text-xl leading-relaxed`
- **Small text**: `text-sm text-muted-foreground`

---

## Color Palette

All colors are defined in `globals.css` using `oklch()` for full CSS color support with Tailwind v4.

### Core colors

| Token | Tailwind | oklch Value | Description |
|-------|----------|-------------|-------------|
| `background` | `bg-background` | `oklch(0.98 0.01 70)` | Warm cream, used as page background |
| `foreground` | `text-foreground` | `oklch(0.22 0.05 280)` | Dark navy-purple, primary text |
| `card` | `bg-card` | `oklch(1 0 0)` | Pure white, card/panel backgrounds |
| `primary` | `bg-primary` | `oklch(0.42 0.2 280)` | Deep indigo-purple, buttons & accents |
| `primary-foreground` | `text-primary-foreground` | `oklch(1 0 0)` | White, text on primary backgrounds |
| `muted` | `bg-muted` | `oklch(0.95 0.008 70)` | Light warm tone, subtle backgrounds |
| `muted-foreground` | `text-muted-foreground` | `oklch(0.55 0.03 280)` | Medium gray-purple, secondary text |
| `border` | `border` | `oklch(0.92 0.008 70)` | Warm light border |

### Accent colors

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| `lavender` | `--color-lavender` | `#C8B6F5` | Feature sections, CTA sections (`.bg-lavender`) |

### Pastel card backgrounds

Used on feature/testimonial cards for visual variety:

- `bg-amber-50` — warm yellow
- `bg-sky-50` — light blue
- `bg-violet-50` — light purple

---

## Backgrounds & Gradients

### Hero warm glow (`.hero-warm-glow`)

Subtle warm radial gradient applied to the hero section:

```css
background:
  radial-gradient(ellipse 60% 50% at 85% 80%, oklch(0.9 0.06 60 / 0.4) 0%, transparent 70%),
  radial-gradient(ellipse 40% 40% at 10% 60%, oklch(0.88 0.05 290 / 0.25) 0%, transparent 70%),
  var(--color-background);
```

- Peach glow in bottom-right
- Subtle lavender glow in left
- Warm cream base

### Lavender sections (`.bg-lavender`)

Full lavender `#C8B6F5` background with white cards inside. Used for "How It Works" and "Final CTA" sections. Always use `rounded-[2rem]` on the lavender container.

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

### Variants

| Variant | Usage |
|---------|-------|
| `default` | Primary purple CTA — hero, pricing, section buttons |
| `outline` | Secondary actions with border |
| `ghost` | Navbar sign-in, subtle actions |
| `secondary` | Warm beige background |

---

## Border Radius

| Element | Radius |
|---------|--------|
| Buttons | `rounded-full` (pill) |
| Cards (standard) | `rounded-2xl` |
| Cards (large/sections) | `rounded-3xl` |
| Lavender containers | `rounded-[2rem]` |
| Icon containers | `rounded-xl` or `rounded-full` |
| Badges/pills | `rounded-full` |

---

## Spacing

Generous whitespace throughout. Sections breathe.

| Element | Padding |
|---------|---------|
| Section vertical | `py-20 md:py-28` |
| Container horizontal | `px-6` |
| Card inner | `p-8` to `p-10` |
| Lavender containers | `p-10 md:p-16` or `p-12 md:p-20` |
| Between section heading and content | `mb-14` to `mb-20` |

---

## Shadows

Soft, minimal. No hard drop shadows.

| Element | Shadow |
|---------|--------|
| Cards | `shadow-sm` or `shadow-md` |
| Pricing card | `shadow-md` |
| White cards inside lavender | `shadow-sm` |

---

## Layout Patterns

### Hero
- Left-aligned text (not centered)
- Max width `max-w-3xl` on text block
- Full viewport height feel: `min-h-[85vh] flex items-center`
- Warm glow background

### Section headings
- Serif font, centered
- Multi-line with `<br />` for intentional line breaks
- Generous bottom margin (`mb-14` to `mb-20`)

### Feature columns
- 3-column grid: `grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16`
- Centered text, serif subheadings

### Lavender card sections
- Outer: `bg-lavender rounded-[2rem] p-10 md:p-16`
- Inner items: `bg-white rounded-2xl px-6 py-5 shadow-sm`
- 2-column grid for items: `grid grid-cols-1 md:grid-cols-2 gap-4`

### Testimonial cards
- Pastel backgrounds (`bg-amber-50`, `bg-sky-50`, `bg-violet-50`)
- `rounded-2xl p-8`
- Quote text, then name/role at bottom

---

## Navbar

- No border, transparent with backdrop blur: `bg-background/80 backdrop-blur-md`
- Height: `h-20`
- Logo: `font-serif text-2xl font-bold text-primary`
- CTA button (logged out): purple pill `px-7 py-5 text-sm`
- Avatar (logged in): `h-9 w-9` with `border-2 border-primary/20`

---

## Footer

- Minimal, single row layout
- Brand name in `font-serif`
- Single "Support" mailto link
- Bottom bar: copyright + Privacy/Terms links

---

## FAQ Accordion

- Native `<details>/<summary>` elements (no JS dependency)
- White card on warm background: `bg-card rounded-2xl p-6 shadow-sm`
- Chevron rotation via CSS: `.faq-chevron` with `rotate(180deg)` on `details[open]`
- Hidden default marker: `list-none` on summary

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

1. **Always use `font-serif` on headings** (h1, h2, h3, pricing numbers, logo)
2. **No hard borders on cards** — use `shadow-sm` or background color contrast
3. **Warm tones only** — no cold grays or blues for backgrounds/borders
4. **Pill buttons everywhere** — never use `rounded-md` on buttons
5. **Generous spacing** — when in doubt, add more whitespace
6. **Pastel card fills** for visual variety — alternate between amber, sky, violet
7. **Lavender `#C8B6F5`** for accent sections — always with `rounded-[2rem]` and white items inside
