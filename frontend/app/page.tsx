"use client"

import { Suspense } from "react"
import { ChatInterface } from "@/components/chat-interface"

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChatInterface />
    </Suspense>
  )
}
