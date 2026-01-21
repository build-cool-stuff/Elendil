# Design Principles of Front-end

## **DESIGN DNA ANALYSIS: Shaders Landing Page**

### **1. THE "VIBE" & AESTHETIC**

**Design Language:** Premium Tech-Forward Minimalism with Generative Art Foundation

This is a **high-end creative studio aesthetic** combined with **web technology sophistication**. The emotional temperature is:

- **Cool, sophisticated, aspirational** — not playful or approachable
- **Intellectual and forward-thinking** — emphasizes cutting-edge digital craftsmanship
- **Subtle, understated confidence** — no aggressive marketing language
- **Generative/algorithmic energy** — the WebGL shaders in the background suggest computational creativity


The design sits at the intersection of **brutalist clarity** and **luxury tech** — every element earns its place. Think high-end creative agencies (Pentagram, MetaDesign) meets generative art installations.

---

### **2. TYPOGRAPHY SYSTEM**

**Font Pairing:** Geist (sans-serif) + Geist Mono (monospace)

| Element | Font | Weight | Size | Line Height | Letter Spacing
|-----|-----|-----|-----|-----|-----
| **Hero H1** | Geist Sans | 300 (light) | 6xl–8xl | 1.1 | tight
| **Section H2** | Geist Sans | 300 (light) | 5xl–7xl | default | tight
| **Card H3** | Geist Sans | 300 (light) | 2xl–4xl | default | default
| **Nav/Body** | Geist Sans | 400–500 | lg–xl | relaxed (1.5–1.6) | default
| **Labels/Meta** | Geist Mono | 400 | xs–sm | default | normal
| **Status Badges** | Geist Mono | 400 | xs | default | normal


**Key Typographic Decisions:**

- Extremely light headings (300 weight) create an airy, sophisticated feel
- Mono font exclusively for metadata, timestamps, and labels → creates clear information hierarchy
- No serif fonts → modern, tech-focused aesthetic
- Generous leading in body copy (leading-relaxed) → premium, readable experience
- Tracking-tight on headings → compressed visual impact


---

### **3. COLOR PALETTE & DEPTH**

**Core Color System:**

| Token | OkLCh Value | Hex Approx. | Purpose
|-----|-----|-----|-----|-----|-----
| **Background** | 0.12 0 0 | `#1a1a1a` | Near-black canvas
| **Foreground** | 0.98 0 0 | `#fafafa` | Off-white text
| **Primary** | 0.65 0.22 250 | `#4080ff` | Accent blue (electric)
| **Accent** | 0.68 0.18 45 | `#d4941c` | Golden-orange warmth
| **Secondary** | 0.25 0 0 | `#3a3a3a` | Subtle UI separators
| **Card/Popover** | 0.15 0 0 | `#262626` | Raised surfaces


**Depth & Layering Strategy:**

- **Dark Mode Only:** No light variant — intentional choice for luxury/sophistication
- **Glassmorphism Throughout:** Subtle `backdrop-blur-md` and `backdrop-blur-xl` on navigation, badges, buttons
- **Micro-transparency Layers:**

- `bg-foreground/15` with blur = elevated, semi-transparent UI elements
- `bg-foreground/5` for secondary buttons = barely-there affordances
- `border-foreground/10` → `border-foreground/20` on hover = hover escalation



- **Shader Background:** Animated WebGL gradient (Swirl + ChromaFlow) provides dynamic depth with blue `#1275d8` and orange `#e19136` accents
- **Shadow Approach:** Minimal hard shadows; relies on transparency and blur for depth


**Color Psychology:**

- Cold blue + warm orange = tension and balance
- High contrast (12% background to 98% foreground) = maximum legibility
- Accent colors pop without screaming (they're used sparingly)


---

### **4. UI GEOMETRY**

**Border Radius Strategy:** **Fully Rounded/Pill-Shaped**

- All interactive elements use `rounded-full`
- Non-interactive elements: `rounded-lg` (0.75rem) for cards/badges
- **No sharp corners** — intentional softness conveys approachability despite austere aesthetic


**Spacing Scale:**

- **Padding:** px-4/py-1.5 (badges) → px-8/py-3.5 (lg buttons)
- **Gaps:** gap-2, gap-4, gap-8 (consistent 4px multiples)
- **Section padding:** px-6 (mobile) → px-12 (md) → px-16 (lg) — horizontal breathing room
- **Vertical spacing:** py-6 (mobile) → py-8 (md) — generous section separation
- **Content max-width:** max-w-7xl on sections, max-w-3xl on hero copy


**Whitespace Philosophy:**

- **Abundant vertical whitespace** between sections (full h-screen blocks)
- **Breathing room around type** — large line heights and generous bottom margins
- **Empty space = luxury** — not cramping content
- **Grid symmetry:** Services use 2-column grid md: up with equal gaps


---

### **5. INTERACTIVE ELEMENTS**

**Button Variants:**

| Variant | Background | Border | Hover State | Special
|-----|-----|-----|-----|-----|-----
| **Primary** | `bg-foreground/95` | None | `scale-[1.02]`, brighten | Solid, high-contrast
| **Secondary** | `bg-foreground/5` | `border-foreground/10` | `bg-foreground/10`, border-foreground/20 | Glassmorphic, subtle
| **Ghost** | transparent | None | `bg-foreground/5` | Minimal, text-only feel


**Unique Interactive Behaviors:**

1. **Magnetic Button Effect:** Custom hook translates button toward cursor (15% dampening)

1. Creates playful, tech-forward interaction
2. Uses `translate3d` for GPU acceleration
3. Snappy return animation on mouse leave



2. **Navigation Underline:** Active/hover states reveal underline

1. `w-0 group-hover:w-full` animation on nav links
2. Smooth 300ms duration



3. **Reveal Animations:** Staggered entrance animations on scroll

1. Elements animate in from different directions (left/right/top/bottom)
2. 150ms stagger between elements
3. Uses `useReveal` hook for viewport detection



4. **Card Hover States:**

1. Project cards: `border-foreground/10` → `border-foreground/20` + title slides 2px right
2. Service cards: accent line expands 8px → 12px on hover
3. All use `transition-all duration-300`



5. **Scroll Indicators:**

1. Pulsing dot inside rounded container (`animate-pulse`)
2. Communicates "scroll to explore" affordance
3. Found at bottom of hero





**Card Layouts:**

- **Project Cards (Work Section):**

- Horizontal layout with alternating direction (`maxWidth` adjusts per index)
- Number + Title + Metadata in flex row
- Divider line (`border-b`) between cards
- No background box — relies on border and typography



- **Service Cards (Services Section):**

- 2-column grid (md breakpoint)
- Animated accent line before title
- Minimal, text-forward design
- No background color — pure typography hierarchy





**Navigation Pattern:**

- Fixed top nav with logo + menu links + CTA button
- Logo animates on hover (`scale-110`)
- Uses horizontal scroll container (full-screen snap sections)
- Touch/wheel events remap to horizontal scroll


---

## **REPLICABLE DESIGN SYSTEM SUMMARY**

To apply this DNA to another project:

1. **Start with dark background** (oklch 12% lightness) + off-white text (98%)
2. **Use 300-weight light headings** with tight tracking and 1.1 line-height
3. **Apply glassmorphic layers:** `backdrop-blur-md` + subtle transparency on UI elements
4. **Fully round all interactive elements** (`rounded-full`)
5. **Embrace whitespace** — sections should breathe; use full-height sections
6. **Mono-font metadata** for all labels, timestamps, and supplementary info
7. **Add micro-interactions:** hover state color escalation + subtle transform animations
8. **Use 2–3 accent colors maximum** — let negative space define composition
9. **Stagger entrance animations** (150ms delays) for flow and sophistication
10. **Prioritize legibility** — high contrast, generous padding, readable mono/sans pairing


This design achieves luxury through **restraint, space, and precision execution** rather than visual noise.