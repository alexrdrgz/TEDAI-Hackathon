export interface EmailScenario {
  id: string;
  context: string;
  to: string;
  tone: string;
  keyPoints?: string[];
}

export interface CalendarScenario {
  id: string;
  context: string;
  attendees: string[];
  tone: string;
  keyPoints?: string[];
}

export const emailScenarios: EmailScenario[] = [
  {
    id: 'client-followup',
    context: 'Follow up with client Sarah Chen about the Q4 project proposal discussed in yesterday\'s meeting. She seemed interested but wanted to review the technical specifications with her team. The proposal includes a new AI-powered dashboard feature that could save them 40% on manual reporting time.',
    to: 'sarah.chen@example.com',
    tone: 'professional and friendly',
    keyPoints: ['Thank her for the productive meeting', 'Offer to schedule a technical demo', 'Highlight the AI dashboard benefits']
  },
  {
    id: 'project-status-update',
    context: 'Send a status update to the development team about the TEDAI Chrome extension project. We\'ve completed the core task queue functionality and are now working on Gemini API integration. The extension is currently in beta testing with 5 internal users.',
    to: 'dev-team@company.com',
    tone: 'informative and encouraging',
    keyPoints: ['Core functionality complete', 'Gemini API integration in progress', 'Beta testing phase started']
  },
  {
    id: 'proposal-submission',
    context: 'Submit a proposal for the AI automation hackathon. Our TEDAI Chrome extension can proactively suggest emails and calendar events based on screen context. We need to highlight the technical innovation and potential market impact.',
    to: 'hackathon@techconference.com',
    tone: 'persuasive and technical',
    keyPoints: ['Proactive AI assistance', 'Screen context analysis', 'Market potential for productivity tools']
  },
  {
    id: 'meeting-request',
    context: 'Request a meeting with the product team to discuss integrating our TEDAI AI agent into their existing workflow tools. We want to explore partnership opportunities and demonstrate the extension\'s capabilities.',
    to: 'product@partnercompany.com',
    tone: 'collaborative and professional',
    keyPoints: ['Partnership exploration', 'Product demonstration', 'Workflow integration potential']
  }
];

export const calendarScenarios: CalendarScenario[] = [
  {
    id: 'team-standup',
    context: 'Schedule a weekly team standup for the TEDAI project. The team consists of 4 developers and 2 designers. We need to discuss progress on the Chrome extension, upcoming deadlines, and any blockers. The meeting should be interactive with time for each person to share updates.',
    attendees: ['dev1@company.com', 'dev2@company.com', 'dev3@company.com', 'dev4@company.com', 'designer1@company.com', 'designer2@company.com'],
    tone: 'collaborative and structured',
    keyPoints: ['Weekly progress review', 'Blockers discussion', 'Upcoming deadlines', 'Individual updates']
  },
  {
    id: 'client-demo',
    context: 'Schedule a product demonstration for potential client TechCorp. They are interested in our AI-powered productivity tools. The demo should showcase the Chrome extension\'s ability to generate contextual emails and calendar events. Include time for Q&A and discussion of implementation.',
    attendees: ['john.smith@techcorp.com', 'sarah.wilson@techcorp.com', 'mike.chen@techcorp.com'],
    tone: 'professional and engaging',
    keyPoints: ['Product demonstration', 'Contextual AI features', 'Implementation discussion', 'Q&A session']
  },
  {
    id: 'quarterly-review',
    context: 'Schedule a quarterly business review meeting with the executive team. We need to present the progress on TEDAI project, discuss budget allocation for next quarter, and review key performance metrics. Include stakeholders from engineering, product, and business development.',
    attendees: ['ceo@company.com', 'cto@company.com', 'cpo@company.com', 'cfo@company.com'],
    tone: 'formal and data-driven',
    keyPoints: ['Project progress review', 'Budget discussion', 'KPI analysis', 'Next quarter planning']
  },
  {
    id: 'technical-workshop',
    context: 'Schedule a technical workshop for the development team on Gemini API integration. The session should cover API best practices, error handling, and performance optimization. Include hands-on coding exercises and troubleshooting tips.',
    attendees: ['dev1@company.com', 'dev2@company.com', 'dev3@company.com', 'dev4@company.com'],
    tone: 'educational and hands-on',
    keyPoints: ['API best practices', 'Error handling', 'Performance optimization', 'Hands-on exercises']
  }
];

export function getRandomEmailScenario(): EmailScenario {
  const randomIndex = Math.floor(Math.random() * emailScenarios.length);
  return emailScenarios[randomIndex];
}

export function getRandomCalendarScenario(): CalendarScenario {
  const randomIndex = Math.floor(Math.random() * calendarScenarios.length);
  return calendarScenarios[randomIndex];
}

export function getEmailScenarioById(id: string): EmailScenario | undefined {
  return emailScenarios.find(scenario => scenario.id === id);
}

export function getCalendarScenarioById(id: string): CalendarScenario | undefined {
  return calendarScenarios.find(scenario => scenario.id === id);
}
