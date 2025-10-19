"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare, PieChart, Loader2 } from "lucide-react"
import Link from "next/link"
import { TimelineMonitor } from "@/components/timeline-monitor"
import { useSession } from "@/lib/session-context"
import { getTimeSummary, TimeSummary } from "@/lib/api"

export function StatsPage() {
  const { currentChatId } = useSession()
  const [timeSummary, setTimeSummary] = useState<TimeSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = currentChatId || '0' // Use default session '0' if no currentChatId
    console.log('[StatsPage] currentChatId:', currentChatId, 'using sessionId:', sessionId)

    const fetchTimeSummary = async () => {
      console.log('[StatsPage] Fetching time summary for session:', sessionId)
      setLoading(true)
      setError(null)
      try {
        const summary = await getTimeSummary(sessionId)
        console.log('[StatsPage] Received time summary:', summary)
        setTimeSummary(summary)
      } catch (err) {
        console.error("[StatsPage] Failed to fetch time summary:", err)
        setError("Failed to load time summary")
      } finally {
        setLoading(false)
      }
    }

    fetchTimeSummary()
  }, [currentChatId])

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
          <TimelineMonitor sessionId={currentChatId || '0'} />
        </Card>

        {/* Time Summary Section */}
        <Card className="p-6 bg-card border-border animate-in fade-in slide-in-from-bottom-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Time Summary
            </h2>
            <p className="text-sm text-muted-foreground mt-1">AI-powered analysis of how you spent your time</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-muted-foreground">
              {error}
            </div>
          )}

          {!loading && !error && timeSummary && (
            <div className="space-y-6">
              {/* Overall Summary */}
              <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                <p className="text-sm leading-relaxed">{timeSummary.summary}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on {timeSummary.totalActivities} tracked activities
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-4">
                {timeSummary.categories.map((category, idx) => (
                  <div
                    key={idx}
                    className="group hover:bg-secondary/10 p-4 rounded-lg transition-all duration-200 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{category.category}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-primary">{category.percentage}%</div>
                        <div className="text-xs text-muted-foreground">{category.duration}</div>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && timeSummary && timeSummary.categories.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No activities tracked yet. Start using the app to see your time summary!
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
