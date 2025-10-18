import { z } from 'zod';

export const ScreenshotSummarySchema = z.object({
  FullDescription: z.string().describe('A 1 paragraph explanation of what is visible'),
  Caption: z.string().describe('A 1 sentence summary of the image, focusing on which task the user is performing'),
  Changes: z.array(z.string()).describe('Short snippets of what changed since last screenshot'),
  Facts: z.array(z.string()).max(3).describe('0-3 facts that can be learned from the screenshot'),
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
