// Screenshot summarization
export { summarizeScreenshot } from './screenshot';

// Timeline generation
export { generateSessionTimeline, generateTimelineEntry } from './timeline';

// Task generation from screenshots using tools
export { checkAndGenerateTask } from './tasks';

// Messaging app action item detection
export { analyzeMessagingForActionItems } from './messaging-tasks';
export type { ActionItem } from './messaging-tasks';

// Task template generation (email/calendar)
export { generateEmailFromContext, generateCalendarFromContext } from './task-templates';

// Chat responses
export { generateChatResponse } from './chat';

// Time summary
export { generateTimeSummary } from './time-summary';
