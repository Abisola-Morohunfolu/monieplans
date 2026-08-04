# DESIGN.md — Aura

Context-first AI landing page builder. Editorial, earthy, botanical-tech
aesthetic — warm neutrals, sage/olive greens, a rust accent, and a serif
display face paired with a clean sans body.

---

## 1. Brand Voice & Mood

- **Tone:** calm, confident, editorial — more "design studio" than "SaaS dashboard"
- **Keywords:** context, craft, natural, considered, warm-minimal
- **Avoid:** neon/electric colors, hard corners, generic "AI purple/blue" gradients

---

## 2. Color Palette

### Neutrals (backgrounds & surfaces)
| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F2EEE5` | Primary page background |
| `bg-card` | `#F7F4ED` | Card / panel background |
| `bg-alt` | `#EDE8DD` | Alternating section background |
| `bg-lightest` | `#FBF9F4` | Innermost surfaces (screens, modals) |

### Text
| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#171512` | Headings, primary body, buttons |
| `text-secondary` | `#6F6B62` | Body copy, descriptions |
| `text-tertiary` | `#9A948A` | Captions, meta, placeholders |

### Accent — Green (primary brand accent)
| Token | Hex | Usage |
|---|---|---|
| `accent-sage` | `#8E9C75` | Highlights, icons, small labels, badges |
| `accent-forest` | `#3B4B34` | Deep green — hover states, dark accents, italic emphasis in headlines |

### Accent — Rust (secondary accent, used sparingly)
| Token | Hex | Usage |
|---|---|---|
| `accent-rust` | `#B96A4A` | Category tags, alert-style badges, gradient border accents |

### Dark surfaces (proof ribbon, featured pricing card, footer base)
| Token | Hex | Usage |
|---|---|---|
| `dark-1` | `#151812` | Darkest gradient stop |
| `dark-2` | `#20251A` | Mid gradient stop |
| `dark-3` | `#2A3322` | Lightest dark gradient stop |

Typical dark gradient: `linear-gradient(165deg, #2A3322 0%, #20251A 55%, #151812 100%)`

Footer background gradient (light → dark): `linear-gradient(180deg, #F2EEE5 0%, #DCE0CE 35%, #8E9C75 75%, #3B4B34 100%)`

---

## 3. Typography

| Role | Font | Weight(s) | Notes |
|---|---|---|---|
| Display / headings | **Cormorant Garamond** (serif) | 400, 500, 600, italic 500 | Google Fonts. Used for all `h1`/`h2`, large numerals, blockquotes, logo wordmark |
| Body / UI | **Inter** (sans) | 400, 500, 600 | Used for paragraphs, nav, buttons, labels |

**Scale (desktop → mobile roughly halves at `md:` breakpoint):**
- Hero H1: `text-5xl` → `md:text-7xl` → `lg:text-8xl`, weight 500, `line-height:1.0`, `tracking-tight`
- Section H2: `text-4xl` → `md:text-5xl` (occasionally `lg:text-6xl`), weight 500
- Card headings (H3): `text-xl`, weight 600
- Body copy: `text-base` / `text-sm`, `text-secondary` color, `leading-relaxed`
- Eyebrow labels: `text-xs`, `font-medium`, `tracking-[0.22em]`, `uppercase`, `accent-sage` color

**Emphasis pattern:** italic serif in the brand green (`accent-forest`) used inline within headlines to highlight one key word (e.g. "built from real *context*").

---

## 4. Layout & Spacing

- **Max content width:** `1200px` (`1080px` for the hero product visual, `820px` for FAQ, `760px` for the integrations diagram)
- **Horizontal padding:** `px-5` mobile, `md:px-8` desktop
- **Section vertical rhythm:** `py-20` mobile, `md:py-28` desktop
- **Corner radii:** generous and consistent — `rounded-full` (pills/buttons), `rounded-2xl` (small cards/FAQ), `rounded-[26px]` (feature/testimonial cards), `rounded-[20px]`–`[26px]` (product screens)
- **Section alternation:** background steps between `bg-base` (#F2EEE5) and `bg-alt` (#EDE8DD) to separate sections without hard borders
- **Grid patterns:** 2–4 column responsive grids (`grid-cols-2 md:grid-cols-4` for stat blocks; `md:grid-cols-3` for pricing/roles/notes; `md:grid-cols-5` for dashboard mock)

---

## 5. Components

### Buttons
- **Primary:** `bg-#171512` text `#F2EEE5`, `rounded-full`, hover → `bg-#3B4B34`
- **Secondary/outline:** `border border-#171512/15`, transparent bg, hover → `bg-#171512/5`
- **On dark surfaces:** `bg-#F2EEE5` text `#151812`, hover → `bg-#8E9C75`
- **Lift interaction (`.btn-lift`):** on hover, `translateY(-2px) scale(1.03)` + soft dark shadow; on active, `translateY(0) scale(0.96)` — spring-like cubic-bezier `(.22,1,.36,1)`

### Cards
- Base: `bg-card` (#F7F4ED), `border border-#171512/8`, large radius (`26px`)
- **Gradient border variant (`.grad-border`):** 1px border using a layered `linear-gradient` from rust → sage → forest at 135deg, applied via `background-clip: padding-box, border-box`
- Shadow: soft, large, dark-tinted, e.g. `0 30px 60px -20px rgba(23,21,18,.35), 0 8px 20px -12px rgba(59,75,52,.25)`
- Image cards: image fills top at `16:10` aspect ratio with a bottom-to-top dark gradient overlay for text legibility; `hover:scale-105` on the image with `duration-700` transition

### Badges / Pills
- Soft-tint pill: colored bg at low opacity (e.g. `bg-#8E9C75/20` text `#3B4B34`, or `bg-#B96A4A/15` text `#B96A4A`), `rounded-full`, `text-xs font-medium`

### Glass / frosted panels
- `background: rgba(255,253,248,0.3–0.45)`, `backdrop-filter: blur(12–24px)`, `border: 1px solid rgba(255,255,255,0.4–0.7)` — used for sticky header, hero device frame, dashboard mock, footer CTA panel

### Featured/highlighted card (e.g. pricing "Most Chosen")
- Dark gradient background (`dark-1`→`dark-2`→`dark-3`), white/cream text, sage accent label, floating badge pill centered on top edge, stronger shadow with green tint (`rgba(59,75,52,0.7)`)

---

## 6. Imagery & Media

- Photography: warm, natural, editorial — desks, teams, design tools, muted tones; never harsh studio lighting
- Every content image gets a subtle bottom-gradient scrim (`rgba(23,21,18,0)` → `rgba(23,21,18,0.35–0.45)`) for text legibility when overlaid
- Ambient background atmosphere: large blurred radial gradients in sage/forest green (`filter: blur(40–50px)`) layered behind hero and dark sections for depth
- Avatar images: circular, with a 2px gradient ring (`rust → sage`, 140deg)

---

## 7. Motion

- **Reveal-on-scroll:** elements start `opacity:0`, `translateY(24px)`, blurred (`filter:blur(10px)`); animate to visible via `IntersectionObserver` at `threshold:0.12`, `0.8s` cubic-bezier `(.22,1,.36,1)`
- **Word-by-word headline animation:** H1/H2 text is split into word spans, each fades/blurs in with a staggered delay (~60–90ms per word)
- **Counters:** numeric stats count up from 0 with `ease-out-cubic` easing over ~1.4s when scrolled into view
- **Parallax:** ambient background blobs shift `translateY` slightly on scroll (subtle, ~0.06x scroll delta)
- **Floating icons:** integration icons gently bob (`translateY` ±8px) on a 5s ease-in-out loop with staggered delays
- All motion respects `prefers-reduced-motion: reduce` (disables animation, parallax, and float entirely)

---

## 8. Iconography

- **Icon set:** Iconify, `solar` icon pack, `-linear` (outline) style throughout
- Icon color typically `accent-forest` (#3B4B34) on light surfaces, or muted `text-tertiary` for inactive nav items

---

## 9. Tone-of-Voice for Copy

- Short, declarative section headers set in serif italic for emphasis
- Body copy: plain, concrete, benefit-first, no hype/superlatives
- Numbers/stats presented as workflow facts ("1 DESIGN.md source", "12 reference inputs") rather than inflated marketing metrics
- Placeholder content (pricing, testimonial, metrics, blog dates) explicitly flagged in the source with `NOTE:` comments — replace with real data before publishing

---

## 10. Do / Don't

**Do**
- Use generous whitespace and large serif display type for section headers
- Pair one sage/forest green accent with a small amount of rust for contrast
- Keep corners soft and consistent (pill buttons, large-radius cards)
- Use frosted-glass surfaces sparingly for "floating" UI chrome (header, device frames)

**Don't**
- Introduce cool blues/purples or neon gradients — off-brand
- Use hard-edged shadows or sharp corners
- Overuse the rust accent — it's a highlight color, not a primary
- Ship placeholder metrics/pricing/testimonials without replacing them