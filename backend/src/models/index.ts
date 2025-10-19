import { z } from 'zod';

export const ScreenshotSummarySchema = z.object({
  FullDescription: z.string().describe('A 1 paragraph explanation of what is visible'),
  Caption: z.string().describe('A 1 sentence summary of the image, focusing on which task the user is performing'),
  Changes: z.array(z.string()).describe('Short snippets of what changed since last screenshot'),
  Facts: z.array(z.string()).max(3).describe('0-3 facts that can be learned from the screenshot'),
  isMessagingApp: z.boolean().optional().describe('Whether the screenshot shows a messaging application'),
});

export type ScreenshotSummary = z.infer<typeof ScreenshotSummarySchema>;

export const TimelineEntrySchema = z.object({
  entry: z.string().describe('A single paragraph/entry to add to the timeline describing what happened at this point'),
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const TimelineEntryDataSchema = z.object({
  text: z.string().describe('The timeline entry text'),
  caption: z.string().describe('The caption/task from the screenshot'),
  timestamp: z.string().describe('ISO timestamp when this entry was created'),
});

export type TimelineEntryData = z.infer<typeof TimelineEntryDataSchema>;

export const TimeCategorySchema = z.object({
  category: z.string().describe('The activity category (e.g., "Coding", "Meetings", "Research", "Email")'),
  description: z.string().describe('Brief description of what was done in this category'),
  percentage: z.number().min(0).max(100).describe('Percentage of time spent (0-100)'),
  duration: z.string().describe('Human-readable duration (e.g., "2 hours 30 minutes")'),
});

export const TimeSummarySchema = z.object({
  categories: z.array(TimeCategorySchema).describe('Array of time categories, sorted by percentage descending'),
  totalActivities: z.number().describe('Total number of activities tracked'),
  summary: z.string().describe('A brief 1-2 sentence overall summary of how time was spent'),
});

export type TimeCategory = z.infer<typeof TimeCategorySchema>;
export type TimeSummary = z.infer<typeof TimeSummarySchema>;
