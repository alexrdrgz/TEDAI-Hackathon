# TEDAI Hackathon Project: Proactive AI Agent

## Project Idea

Develop an intelligent AI agent that continuously monitors a user's computer screen to provide smart suggestions and take actionable steps on their behalf. The agent will include a live chat interface with persistent memory, enabling context-aware conversations without users having to repeat themselves.

## Core Features

### 1. Screen Monitoring & Proactive Suggestions

- **Real-time Analysis:** The agent analyzes on-screen content (e.g., open applications, documents, emails, calendar events) to understand user context and intent.
- **Smart Suggestions:** Based on the analysis, the agent proactively suggests relevant actions or information. For example, if the user is writing an email, it might suggest relevant contacts, files, or autocomplete sentences.

### 2. Actionable Task Execution

The agent can perform common computer tasks, such as:
- **Email Management:** Draft, send, schedule, and categorize emails.
- **Calendar Management:** Schedule meetings, set reminders, and manage events.
- **Document Creation & Editing:** Assist with writing, formatting, and summarizing.
- **Other Potential Tasks:** (Dependent on feasibility and user needs)
  - Data entry
  - Web searches
  - Price/product comparison
  - Prompt improvement
  - Meeting summaries (potential Zoom integration)
  - Restyling or reconfiguring any website being used
  - Fact checking or analysis (e.g., Command + AI)
  - Image analysis

#### **Core Concern:** Preventing the app from oversuggesting actionable tasks.

### 3. Live Chat with Session Memory

- **Context-Aware Conversations:** The AI interface retains memory for the user session to avoid repeated explanations.
- **Natural Language Understanding:** Users can interact with the agent naturally to request tasks, ask questions, or provide instructions.

## Nice-to-Have Features

### 1. Daily Activity Analytics

- **Usage Analysis:** Insights into daily computer use, time spent on apps, tasks performed, and productivity.
- **Visual Display:** Graphical dashboard for analytics, helping users visualize work habits and find opportunities for improvement.

## Technology Stack

### Implemented
- **Frontend:** React + TypeScript + Vite (standalone chat interface)
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite3 (persistent storage)
- **AI:** Google Gemini 2.5 Flash API
- **Communication:** HTTP Long-Polling
- **Screen Monitoring:** Python screenshot capture + Gemini vision analysis

### Additional Considerations
- **Screen Monitoring:** OCR libraries, screenshot APIs, accessibility APIs
- **Advanced Analytics:** Vector databases for semantic search

## Setup

### Backend Server
```bash
cd backend
npm install
# Create .env file with GEMINI_API_KEY
npm run dev
```

### Chat Frontend
```bash
cd chat-frontend
npm install
npm run dev
```

📖 **See [CHAT_SETUP.md](./CHAT_SETUP.md) for detailed instructions**
