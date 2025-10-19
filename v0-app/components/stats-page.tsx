"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare } from "lucide-react"
import Link from "next/link"
import { TimelineMonitor } from "@/components/timeline-monitor"
import { useSession } from "@/lib/session-context"

export function StatsPage() {
  const { sessionId } = useSession()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-secondary transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Context Monitor
              </h1>
              <p className="text-muted-foreground mt-1">Real-time activity tracking and insights</p>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <Card className="p-6 bg-card border-border animate-in fade-in slide-in-from-bottom-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Activity Timeline
            </h2>
            <p className="text-sm text-muted-foreground mt-1">View screenshots and activity snapshots from your session</p>
          </div>
          <TimelineMonitor sessionId={sessionId ?? undefined} />
        </Card>
      </div>
    </div>
  )
}
