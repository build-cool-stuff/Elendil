# Free Real Estate - Codebase Overview

## What Is This?

A modern, visually stunning **creative agency landing page** built with Next.js 15 and React 19. The standout feature is the WebGL shader background that creates fluid, animated visual effects. The site uses horizontal scrolling to navigate between sections.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.5.6 |
| React | React 19.2.0 |
| Styling | Tailwind CSS 4.1.9 |
| UI Components | Radix UI (full suite) |
| Forms | React Hook Form + Zod |
| Animations | tw-animate-css, custom CSS |
| Shaders | `shaders` package (Swirl, ChromaFlow) |
| Charts | Recharts |
| Icons | Lucide React |
| Analytics | Vercel Analytics |
| Fonts | Geist, Geist Mono |

---

## Project Structure

```
/
├── app/
│   ├── page.tsx          # Main page - horizontal scroll container
│   ├── layout.tsx        # Root layout with fonts/analytics
│   └── globals.css       # Theme tokens (OKLCH colors) + Tailwind
├── components/
│   ├── custom-cursor.tsx     # Smooth-following dual-ring cursor
│   ├── grain-overlay.tsx     # Film grain SVG overlay
│   ├── magnetic-button.tsx   # Buttons that follow mouse position
│   ├── work-section.tsx      # Featured projects showcase
│   ├── services-section.tsx  # Capabilities grid
│   ├── about-section.tsx     # Company story + stats
│   └── contact-section.tsx   # Contact form + info
├── hooks/
│   └── use-reveal.ts         # Intersection Observer for scroll animations
├── lib/
│   └── utils.ts              # cn() helper for class merging
└── config files...
```

---

## Key Features

### 1. WebGL Shader Background
The hero uses `shaders/react` with two layered effects:
- **Swirl**: Blue (#1275d8) and orange (#e19136) animated pattern
- **ChromaFlow**: Mouse-reactive color shifts

### 2. Horizontal Scroll Navigation
- Vertical scroll/swipe translates to horizontal movement
- 5 sections: Home, Work, Services, About, Contact
- Smooth scroll snapping

### 3. Custom Cursor
- Dual-element design (outer ring + inner dot)
- Smooth lerp-based following (0.15 factor)
- Scales up on interactive elements
- Mix-blend-mode: difference

### 4. Magnetic Buttons
- Follow mouse position within bounds (0.15 multiplier)
- Three variants: primary, secondary, ghost
- GPU-accelerated transforms

### 5. Reveal Animations
- `useReveal` hook uses Intersection Observer
- Elements slide in from different directions
- Staggered delays for sequential reveals

---

## Color System (OKLCH)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | oklch(0.12 0 0) | Near-black base |
| `--foreground` | oklch(0.98 0 0) | Near-white text |
| `--primary` | oklch(0.65 0.22 250) | Blue accent |
| `--accent` | oklch(0.68 0.18 45) | Orange accent |

Dark mode is default. Light/dark themes share similar tokens.

---

## Section Breakdown

### Hero Section
- Animated badge ("WebGL Powered Design")
- Large headline with staggered fade-in
- Two CTAs: "Open in v0" + "View Demo"
- Scroll indicator at bottom

### Work Section
- 3 featured projects with alternating layouts
- Hover effects on project cards
- Slide-in animations from left/right

### Services Section
- 2x2 grid of capabilities
- Each card reveals from different direction
- Numbered items with expanding line accent

### About Section
- Two-column layout: story + stats
- Stats alternate alignment (left/right)
- Large numbers with labels

### Contact Section
- Two-column: info + form
- Email, location, social links
- Form with name/email/message
- Simulated submission (1.5s delay)

---

## Performance Optimizations

- `contain: strict` on shader container
- `will-change: transform` on animated elements
- `transform: translateZ(0)` for GPU acceleration
- `requestAnimationFrame` for cursor/button updates
- Throttled scroll handling
- Fallback timer for shader loading

---

## Notable Patterns

1. **Refs over State**: Cursor/button positions stored in refs to avoid re-renders
2. **Lerp Smoothing**: `start + (end - start) * factor` for buttery animations
3. **Direction-based Reveals**: Each element knows which direction to animate from
4. **Scroll Hijacking**: Vertical wheel/touch converted to horizontal scroll

---

## Commands

```bash
npm run dev    # Start development server
npm run build  # Production build
npm run start  # Start production server
npm run lint   # Run ESLint
```

---

## Origin

Generated with [v0.app](https://v0.app/templates/R3n0gnvYFbO) - Vercel's AI-powered UI generator.
