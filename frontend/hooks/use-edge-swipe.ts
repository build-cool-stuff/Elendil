import { useEffect, useRef } from "react"

/**
 * Detects a left-to-right swipe anywhere on screen to open the mobile drawer.
 *
 * Why touchend-based instead of touchmove-based:
 * On iOS Safari, scrollable containers (overflow-y-auto) take ownership of
 * touch gestures once scrolling begins. The browser throttles or suppresses
 * touchmove horizontal data mid-gesture. However, touchstart and touchend
 * ALWAYS fire reliably with accurate coordinates.
 *
 * So we record the start position + time on touchstart, then evaluate the
 * full gesture on touchend: was it far enough, fast enough, and horizontal
 * enough to be an intentional swipe?
 *
 * Thresholds:
 * - Distance: ≥70px horizontal (a deliberate swipe, not a tap)
 * - Direction: horizontal ≥ 1.5x vertical (not a scroll)
 * - Speed: ≥200px/s (a real flick, not a slow drag)
 * - Only on mobile (<768px)
 */

const MIN_DISTANCE = 70       // px horizontal
const DIRECTION_RATIO = 1.5   // dx must be ≥ ratio * dy
const MIN_VELOCITY = 200      // px per second
const MOBILE_BREAKPOINT = 768

export function useEdgeSwipe(onSwipe: () => void) {
  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      startX.current = touch.clientX
      startY.current = touch.clientY
      startTime.current = Date.now()
    }

    function onTouchEnd(e: TouchEvent) {
      if (window.innerWidth >= MOBILE_BREAKPOINT) return

      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX.current
      const dy = Math.abs(touch.clientY - startY.current)
      const elapsed = (Date.now() - startTime.current) / 1000 // seconds

      // Must be moving right
      if (dx < MIN_DISTANCE) return

      // Must be predominantly horizontal
      if (dx < dy * DIRECTION_RATIO) return

      // Must be fast enough (intentional flick, not slow drag)
      const velocity = dx / elapsed
      if (velocity < MIN_VELOCITY) return

      onSwipe()
    }

    // Use capture phase to get coordinates before scroll containers interfere
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true })
    document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true })

    return () => {
      document.removeEventListener("touchstart", onTouchStart, { capture: true } as EventListenerOptions)
      document.removeEventListener("touchend", onTouchEnd, { capture: true } as EventListenerOptions)
    }
  }, [onSwipe])
}
