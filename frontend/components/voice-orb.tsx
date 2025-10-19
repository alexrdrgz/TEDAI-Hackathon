"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface VoiceOrbProps {
  isPlaying: boolean
  isSpeaking?: boolean
  isVoiceDetected?: boolean
}

export function VoiceOrb({ isPlaying, isSpeaking = false, isVoiceDetected = false }: VoiceOrbProps) {
  const [intensity, setIntensity] = useState(0)

  useEffect(() => {
    if (isPlaying || isSpeaking) {
      const interval = setInterval(() => {
        // More intense animation when voice is detected
        const maxIntensity = isVoiceDetected ? 1 : 0.5
        setIntensity(Math.random() * maxIntensity)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setIntensity(0)
    }
  }, [isPlaying, isSpeaking, isVoiceDetected])

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      <div
        className={cn(
          "absolute w-96 h-96 rounded-full animate-pulse-glow",
          isSpeaking ? "bg-accent/5" : "bg-primary/5",
          (isPlaying || isSpeaking) && "opacity-100"
        )}
      />
      <div
        className={cn(
          "absolute w-80 h-80 rounded-full animate-pulse-glow",
          isSpeaking ? "bg-accent/10" : "bg-primary/10",
          (isPlaying || isSpeaking) && "opacity-100"
        )}
        style={{ animationDelay: "0.3s" }}
      />
      <div
        className={cn(
          "absolute w-64 h-64 rounded-full animate-pulse-glow",
          isSpeaking ? "bg-accent/15" : "bg-primary/15",
          (isPlaying || isSpeaking) && "opacity-100"
        )}
        style={{ animationDelay: "0.6s" }}
      />

      {/* Main orb */}
      <div
        className={cn(
          "relative w-48 h-48 rounded-full transition-all duration-300",
          isSpeaking
            ? "bg-gradient-to-br from-accent via-primary to-accent shadow-2xl shadow-accent/50"
            : "bg-gradient-to-br from-primary via-accent to-primary shadow-2xl shadow-primary/50",
          (isPlaying || isSpeaking) && "scale-110",
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
      {(isPlaying || isSpeaking) && (
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-2 h-2 rounded-full animate-float",
                isSpeaking ? "bg-accent/60" : "bg-primary/60"
              )}
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
        <p className="text-lg font-medium text-foreground">
          {isSpeaking ? "Speaking..." : isPlaying ? "Listening..." : "Voice Mode Active"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isSpeaking ? "AI is responding" : isPlaying ? (isVoiceDetected ? "Voice detected..." : "Start speaking...") : "Waiting to listen"}
        </p>
      </div>
    </div>
  )
}
