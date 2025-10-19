export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  toolUseId: string;
  output: string;
  isError?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (input: Record<string, any>) => Promise<string>;
}

// Import all tools
import { getSnapshotContextTool } from './getSnapshotContext';
<<<<<<< HEAD
import { sendEmailTool } from './sendEmail';
=======
import { createEmailTool } from './createEmail';
>>>>>>> main
import { createCalendarEventTool } from './createCalendarEvent';

const tools: Map<string, Tool> = new Map();

// Register tools
export function registerTool(tool: Tool) {
  tools.set(tool.name, tool);
}

// Initialize all tools
export function initializeTools() {
  registerTool(getSnapshotContextTool);
<<<<<<< HEAD
  registerTool(sendEmailTool);
=======
  registerTool(createEmailTool);
>>>>>>> main
  registerTool(createCalendarEventTool);
}

// Get all tools for Gemini
export function getToolDefinitions() {
  return Array.from(tools.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

// Get only task creation tools (email and calendar)
export function getTaskCreationToolDefinitions() {
  return Array.from(tools.values())
    .filter(tool => tool.name === 'create_email' || tool.name === 'create_calendar_event')
    .map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
}

// Execute a tool
export async function executeTool(toolName: string, input: Record<string, any>): Promise<string> {
  const tool = tools.get(toolName);
  if (!tool) {
    throw new Error(`Tool "${toolName}" not found`);
  }
  return tool.execute(input);
}

// Get tool by name
export function getTool(toolName: string): Tool | undefined {
  return tools.get(toolName);
}
