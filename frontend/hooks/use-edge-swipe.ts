import { useEffect, useRef } from "react"

/**
 * Detects a left-edge swipe gesture to open a mobile drawer.
 *
 * Why edge-swipe: Mobile UIs have a spatial model where the menu lives
 * on the left. Pulling from the left edge mimics physically sliding a
 * drawer open — the same pattern used by iOS (UIScreenEdgePanGestureRecognizer)
 * and Android's Material navigation drawer.
 *
 * The gesture only activates when:
 * 1. Touch starts within EDGE_ZONE (30px) of the left screen edge
 * 2. Horizontal movement exceeds SWIPE_THRESHOLD (50px)
 * 3. Movement is predominantly horizontal (not a vertical scroll)
 * 4. Screen width is below MOBILE_BREAKPOINT (768px / md)
 */

const EDGE_ZONE = 30         // px from left edge to start tracking
const SWIPE_THRESHOLD = 50   // px of horizontal movement to trigger
const MOBILE_BREAKPOINT = 768 // matches Tailwind's md: breakpoint

export function useEdgeSwipe(onSwipe: () => void) {
  const tracking = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.innerWidth >= MOBILE_BREAKPOINT) return
      const touch = e.touches[0]
      if (touch.clientX <= EDGE_ZONE) {
        tracking.current = true
        startX.current = touch.clientX
        startY.current = touch.clientY
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - startX.current
      const dy = Math.abs(touch.clientY - startY.current)

      // If vertical movement dominates, this is a scroll — abort
      if (dy > dx) {
        tracking.current = false
        return
      }

      if (dx >= SWIPE_THRESHOLD) {
        tracking.current = false
        onSwipe()
      }
    }

    function onTouchEnd() {
      tracking.current = false
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [onSwipe])
}
