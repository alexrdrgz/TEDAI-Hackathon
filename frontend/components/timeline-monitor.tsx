"use client"

import { useState, useEffect } from "react"
import { getTimelineSnapshots, getAllSnapshots, Snapshot } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface TimelineMonitorProps {
  sessionId?: string
}

export function TimelineMonitor({ sessionId }: TimelineMonitorProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTimeline()
    const interval = setInterval(loadTimeline, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const loadTimeline = async () => {
    try {
      const data = sessionId ? await getTimelineSnapshots(sessionId) : await getAllSnapshots()
      setSnapshots(data)
      setError(null)
    } catch (err: any) {
      if (err.message?.includes("Network")) {
        console.log("Backend temporarily unavailable, retrying...")
      } else {
        setError((err as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const getTimePosition = (timestamp: string): number => {
    if (snapshots.length === 0) return 0
    if (snapshots.length === 1) return 50

    const times = snapshots.map((s) => new Date(s.created_at).getTime())
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const range = maxTime - minTime

    if (range === 0) return 50

    const currentTime = new Date(timestamp).getTime()
    return ((currentTime - minTime) / range) * 100
  }

  if (loading && snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    )
  }

  if (error && snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Error: {error}</p>
        </Card>
      </div>
    )
  }

  const selected = selectedIndex !== null ? snapshots[selectedIndex] : null

  const getScreenshotFilename = (path: string): string => {
    return path.split("/").pop() || path
  }

  return (
    <div className="space-y-6">
      {/* Timeline Track */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-6">Activity Timeline</h3>
        <div className="relative px-4 py-8">
          {/* Timeline line */}
          <div className="absolute left-4 right-4 top-8 h-1 bg-gradient-to-r from-primary via-accent to-primary/20" />

          {/* Timeline events */}
          <div className="relative h-16">
            {snapshots.map((snapshot, index) => {
              const isSelected = selectedIndex === index
              const position = getTimePosition(snapshot.created_at)
              return (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className="group absolute flex flex-col items-center gap-2 -translate-x-1/2"
                  style={{ left: `${position}%` }}
                  title={snapshot.caption}
                >
                  {/* Timeline dot */}
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isSelected
                        ? "bg-primary scale-150 shadow-lg shadow-primary/50"
                        : "bg-primary/40 group-hover:bg-primary/60"
                    }`}
                  />
                  {/* Time label */}
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200 whitespace-nowrap">
                    {formatTime(snapshot.created_at)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Detail View */}
      {selected ? (
        <Card className="p-6 bg-card border-border space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">{selected.caption}</h3>
              <p className="text-xs text-muted-foreground mt-1">{new Date(selected.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIndex((prev) => (prev === 0 ? snapshots.length - 1 : (prev || 0) - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIndex((prev) => ((prev ?? -1) + 1) % snapshots.length)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Screenshot - Full Width */}
          <div className="w-full bg-secondary rounded-lg overflow-hidden border border-border min-h-[400px] flex items-center justify-center">
            <img
              src={`${API_BASE_URL}/monitor/screenshot/${getScreenshotFilename(selected.screenshot_path)}`}
              alt="Screenshot"
              className="max-w-full max-h-[600px] object-contain"
            />
          </div>

          {/* Info Grid - Below Screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {selected.full_description && (
              <div className="md:col-span-3">
                <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Description</h4>
                <p className="text-sm text-foreground leading-relaxed">{selected.full_description}</p>
              </div>
            )}

            {selected.changes && selected.changes.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Changes</h4>
                <ul className="text-sm space-y-2 text-foreground/90">
                  {selected.changes.map((change, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-accent mt-0.5 flex-shrink-0">→</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.facts && selected.facts.length > 0 && (
              <div className={selected.changes && selected.changes.length > 0 ? "md:col-span-1" : "md:col-span-3"}>
                <h4 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Facts</h4>
                <ul className="text-sm space-y-2 text-foreground/90">
                  {selected.facts.map((fact, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-12 bg-card border-border text-center">
          <p className="text-muted-foreground">Select a point on the timeline to view details</p>
        </Card>
      )}
    </div>
  )
}
