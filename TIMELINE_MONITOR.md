# Timeline Monitor - Stats Page

## Overview
A lightweight, dashboard-style statistics page for visualizing screenshot timelines and streaming activity in real-time.

## Access
- **URL:** `/stats?session={sessionId}`
- **Button:** 📊 icon in the bottom-right corner of the chat interface

## Features

### Horizontal Timeline Graph
- **Minimal Design:** Clean, muted color scheme (grays and subtle contrasts)
- **Staggered Labels:** Timeline event labels are automatically alternated (top/bottom) to prevent overlapping
- **Interactive Points:** Click any point on the timeline to view full details
- **Real-time Updates:** Automatically refreshes every 2 seconds to capture new screenshots

### Detail View
- **Side-by-side Layout:** Screenshot on left (55%), metadata on right (45%)
- **Landscape Optimized:** Fits naturally on wide screens
- **Dashboard Feel:** Clean typography and spacing inspired by system monitors
- **Responsive:** Adapts to narrower screens with stacked layout

### Metadata Display
- **Caption:** Brief description of what changed
- **Changes:** Bulleted list of detected changes
- **Timestamp:** Full ISO timestamp of capture

## Technical Implementation

### Backend
- **Route:** `GET /api/monitor/timeline/:sessionId`
- **Response:** Array of snapshot objects with path, caption, changes, and timestamp

### Frontend
- **Components:**
  - `TimelineMonitor.tsx` - Main timeline visualization component
  - `StatsPage.tsx` - Page wrapper with header and routing
- **Routing:** React Router with `/stats` path parameter support
- **Styling:** Muted palette (#333, #666, #999, #f5f5f5)

## Styling Highlights
- **Light Background:** #f5f5f5 with white detail sections
- **Borders:** Subtle #ddd dividers
- **Text:** Dark gray (#333) headings, medium gray (#666) body text
- **Timeline Dots:** Gray (#999) default, darker (#555) on hover/active
- **No Bright Colors:** Dashboard aesthetic with professional neutrality

## Responsive Breakpoints
- **1200px and below:** Detail section switches to vertical stack
- **768px and below:** Compact timeline, reduced padding, smaller fonts
