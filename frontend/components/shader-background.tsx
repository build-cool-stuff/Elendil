"use client"

import { useRef, useEffect, useState } from "react"
import { Shader, ChromaFlow, Swirl } from "shaders/react"

export function ShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined

    const checkReady = () => {
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector("canvas")
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsReady(true)
          if (intervalId) clearInterval(intervalId)
          if (fallbackTimer) clearTimeout(fallbackTimer)
          return true
        }
      }
      return false
    }

    if (checkReady()) return

    intervalId = setInterval(() => {
      checkReady()
    }, 100)

    fallbackTimer = setTimeout(() => {
      if (intervalId) clearInterval(intervalId)
      setIsReady(true)
    }, 1500)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-0 transition-opacity duration-700 ${isReady ? "opacity-100" : "opacity-0"}`}
      style={{ contain: "strict" }}
    >
      <Shader className="h-full w-full">
        <Swirl
          colorA="#1275d8"
          colorB="#e19136"
          speed={0.8}
          detail={0.8}
          blend={50}
          coarseX={40}
          coarseY={40}
          mediumX={40}
          mediumY={40}
          fineX={40}
          fineY={40}
        />
        <ChromaFlow
          baseColor="#0066ff"
          upColor="#0066ff"
          downColor="#d1d1d1"
          leftColor="#e19136"
          rightColor="#e19136"
          intensity={0.9}
          radius={1.8}
          momentum={25}
          maskType="alpha"
          opacity={0.97}
        />
      </Shader>
      <div className="absolute inset-0 bg-black/20" />
    </div>
  )
}
