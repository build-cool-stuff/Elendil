import { useEffect, useRef } from "react"

/**
 * Detects a left-to-right swipe anywhere on screen to open a mobile drawer.
 *
 * Works from any starting position — no edge zone restriction.
 * Uses three signals to distinguish an intentional menu-open gesture
 * from normal scrolling or tapping:
 *
 * 1. Direction: must be left-to-right (positive dx)
 * 2. Ratio: horizontal distance must be ≥2x vertical distance
 *    (filters out diagonal scrolls and vertical flicks)
 * 3. Distance: must travel at least 80px horizontally
 *    (filters out taps and small adjustments)
 *
 * Only activates below Tailwind's md breakpoint (768px).
 * All listeners are passive to avoid blocking scroll performance.
 */

const SWIPE_THRESHOLD = 80    // px of horizontal movement to trigger
const DIRECTION_RATIO = 2     // horizontal must be Nx vertical
const MOBILE_BREAKPOINT = 768 // matches Tailwind md:

export function useEdgeSwipe(onSwipe: () => void) {
  const startX = useRef(0)
  const startY = useRef(0)
  const fired = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      startX.current = touch.clientX
      startY.current = touch.clientY
      fired.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (fired.current) return
      if (window.innerWidth >= MOBILE_BREAKPOINT) return

      const touch = e.touches[0]
      const dx = touch.clientX - startX.current
      const dy = Math.abs(touch.clientY - startY.current)

      // Must be moving right
      if (dx <= 0) return

      // Must be predominantly horizontal
      if (dy * DIRECTION_RATIO > dx) return

      // Must travel far enough
      if (dx >= SWIPE_THRESHOLD) {
        fired.current = true
        onSwipe()
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })

    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
    }
  }, [onSwipe])
}
