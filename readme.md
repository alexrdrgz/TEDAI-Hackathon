# TEDAI Hackathon Project: Proactive AI Agent

## Project Idea

Develop an intelligent AI agent that continuously monitors a user's computer screen to provide smart suggestions and take actionable steps on their behalf. The agent will include a live chat interface with persistent memory, enabling context-aware conversations without users having to repeat themselves.

## ✅ Current Implementation Status

The **live chat interface with persistent memory** has been fully implemented! See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for complete details.

### What's Working Now:
- ✅ Real-time chat interface with Google Gemini AI
- ✅ Persistent conversation memory using SQLite
- ✅ Context-aware AI responses
- ✅ Modern, animated UI with React
- ✅ Chrome extension integration
- ✅ REST API backend with Express.js

### Quick Start:
See [SETUP.md](SETUP.md) for detailed setup and testing instructions.

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

## Technology Stack (Proposed)

- **Front-end:** React, Vue.js (for the interface and chat)
- **Back-end:** Python (Flask/Django), Node.js (agent logic, API handling)
- **AI/ML:** TensorFlow, PyTorch, Hugging Face Transformers (NLP, screen analysis, task automation)
- **Screen Monitoring:** OCR libraries, screenshot APIs, accessibility APIs (to capture and interpret screen content)
- **Memory/Context:** Vector databases, persistent storage (to maintain conversation history and context)

### The primary goals for this live chat interface development are:

- **Real-time Communication:** Establish seamless, low-latency communication between the React frontend and the Node.js backend.
- **Intuitive User Experience:** Design a clean and easy-to-use interface for sending messages and viewing agent responses.
- **Demonstrate Core Functionality:** Clearly showcase the AI Agent's ability to provide suggestions and execute tasks.
- **Robustness:** Ensure stable communication and error handling.
