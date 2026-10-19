# Amara — Design System

> Direction: **Modern herbalist.** Organic wellness, small-batch, no
> preservatives. The signature colour is the dusty **garnet-rose** lifted from
> the wreath logo, paired with a deep **moss green** (living plant material) on
> warm **rosy-oat paper**. Display type is a soft organic serif (**Fraunces**);
> body/UI is **Geist Sans**. Light is primary; dark is the automatic counterpart.

This file documents the tokens. The **single source of truth is
`app/globals.css`** — components never hardcode colour; they use the semantic
tokens (or the Tailwind utilities mapped from them, e.g. `bg-background`,
`text-muted-foreground`, `text-clay`).

## Token layers

1. **Primitives** — the raw palette ramp (`--oat-*`, `--moss-*`, `--rose-*`,
   `--bark-*`). Documentation of the range; not referenced by components.
2. **Semantic** — role tokens consumed by the UI. These flip between light and
   dark. This is the layer you reference.
3. **Component** — radii, fonts, and the `@theme inline` block that maps each
   semantic token to a Tailwind utility.

## Colour (semantic)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | `#f4eee9` | `#1b1714` | page paper / espresso-black |
| `--foreground` | `#2b2422` | `#ede4d9` | primary text |
| `--card` / `--popover` | `#faf6f2` | `#241e19` | raised surfaces |
| `--primary` | `#38452f` | `#9fb389` | moss green — primary buttons, CTA band |
| `--primary-foreground` | `#f4eee9` | `#1b1714` | text on primary |
| `--secondary` | `#e9ded3` | `#2c241e` | quiet fills |
| `--muted` | `#eae2da` | `#2c241e` | subtle surface |
| `--muted-foreground` | `#6e635b` | `#a89c90` | secondary text |
| `--accent` | `#ede4da` | `#2c241e` | hover surface (NOT the brand accent) |
| `--border` / `--input` | `#e1d7cc` | `white/12%` | hairlines, fields |
| `--clay` | `#9e4a5c` | `#ce8294` | **the one brand accent — garnet-rose** |
| `--clay-foreground` | `#fbf7f4` | `#1b1410` | text on the accent |
| `--ring` | `#9e4a5c` | `#ce8294` | focus ring |

**Rule — spend the accent sparingly.** `--clay` (rose) is the single brand
colour: eyebrows, links, the heart/wishlist, sale badges, focus. Primary
actions use moss `--primary`. Everything else is paper, ink, and quiet neutrals.

## Typography

- **Display / headings → Fraunces** (`--font-fraunces`, mapped to the
  `font-heading` utility and applied to `h1/h2/h3` globally). Use weights
  400–500 at large sizes; let the serif breathe. Not all-caps.
- **Body / UI → Geist Sans** (`--font-sans`). Keep body line length < 70ch
  (`max-w-md` / `max-w-prose`).
- **Mono → Geist Mono** (`--font-mono`), data only.
- `.eyebrow` is a **serif italic in rose**, sentence case — deliberately *not*
  the tracked-out all-caps label (a generated-design tell).

## Shape & space

- `--radius: 0.875rem`; the `radius-{sm,md,lg,xl,2xl}` scale derives from it.
  Soft, organic corners. Hero/feature surfaces use larger radii (`~2rem`).
- Controls: inputs `h-10`, buttons `h-10` (default) / `h-11` (lg) — comfortable
  mobile tap targets.

## Anti-cliché guardrails (from the design review)

Avoid the common generated-design tells:
- The cream `#F4F1EA` + terracotta `#D97757` + serif combo — we pivoted to
  **rose + moss on rosy-oat** precisely to step off it.
- All-caps tracked eyebrows; meta joined with middle dots; `WORD — fragment`
  labels; `→` appended to buttons; identical rounded cards with one grey shadow.
- One accented word in a headline. Keep headlines whole.

## Light / dark

Dark mode is automatic via `@media (prefers-color-scheme: dark)` (a `.dark`
class mirrors it for a future manual toggle). Because `globals.css` owns every
token in both modes, dark mode stays fully consistent — there is no runtime
colour injection to clobber it. (The admin "brand colour" pickers in
`/admin/content` are currently inert; re-wire them with dark variants if that
feature is wanted again.)
