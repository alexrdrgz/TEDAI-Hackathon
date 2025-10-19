"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface VoiceOrbProps {
  isPlaying: boolean
}

export function VoiceOrb({ isPlaying }: VoiceOrbProps) {
  const [intensity, setIntensity] = useState(0)

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setIntensity(Math.random())
      }, 100)
      return () => clearInterval(interval)
    } else {
      setIntensity(0)
    }
  }, [isPlaying])

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      <div
        className={cn("absolute w-96 h-96 rounded-full bg-primary/5 animate-pulse-glow", isPlaying && "opacity-100")}
      />
      <div
        className={cn("absolute w-80 h-80 rounded-full bg-primary/10 animate-pulse-glow", isPlaying && "opacity-100")}
        style={{ animationDelay: "0.3s" }}
      />
      <div
        className={cn("absolute w-64 h-64 rounded-full bg-primary/15 animate-pulse-glow", isPlaying && "opacity-100")}
        style={{ animationDelay: "0.6s" }}
      />

      {/* Main orb */}
      <div
        className={cn(
          "relative w-48 h-48 rounded-full transition-all duration-300",
          "bg-gradient-to-br from-primary via-accent to-primary",
          "shadow-2xl shadow-primary/50",
          isPlaying && "scale-110",
        )}
        style={{
          transform: `scale(${1 + intensity * 0.2})`,
          filter: `blur(${intensity * 2}px)`,
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse-glow" />

        {/* Shimmer effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="w-full h-full animate-shimmer" />
        </div>
      </div>

      {/* Floating particles */}
      {isPlaying && (
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/60 animate-float"
              style={{
                left: `${50 + Math.cos((i * Math.PI) / 4) * 150}px`,
                top: `${50 + Math.sin((i * Math.PI) / 4) * 150}px`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Status text */}
      <div className="absolute -bottom-16 text-center">
        <p className="text-lg font-medium text-foreground">{isPlaying ? "Listening..." : "Voice Mode Active"}</p>
        <p className="text-sm text-muted-foreground mt-1">{isPlaying ? "Processing your voice" : "Tap to speak"}</p>
      </div>
    </div>
  )
}
