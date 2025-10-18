// Calendar utility functions for TEDAI Chrome Extension

export interface CalendarEventData {
  title: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  attendees?: string[];
  location?: string;
  reminder?: number; // minutes before event
}

/**
 * Generate Google Calendar URL with pre-filled event data
 */
export function generateGoogleCalendarUrl(eventData: CalendarEventData): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  const params = new URLSearchParams();
  params.append('text', eventData.title);
  
  // Convert ISO dates to Google Calendar format (YYYYMMDDTHHMMSSZ)
  const startDate = new Date(eventData.startTime);
  const endDate = new Date(eventData.endTime);
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  params.append('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
  
  if (eventData.description) {
    params.append('details', eventData.description);
  }
  
  if (eventData.location) {
    params.append('location', eventData.location);
  }
  
  if (eventData.attendees && eventData.attendees.length > 0) {
    params.append('add', eventData.attendees.join(','));
  }
  
  return `${baseUrl}&${params.toString()}`;
}

/**
 * Generate RFC 5545 compliant iCalendar (.ics) content
 */
export function generateIcsContent(eventData: CalendarEventData): string {
  const startDate = new Date(eventData.startTime);
  const endDate = new Date(eventData.endTime);
  
  // Generate unique ID for the event
  const uid = `tedai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@tedai-agent`;
  
  // Format dates for iCalendar (YYYYMMDDTHHMMSSZ)
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TEDAI AI Agent//Calendar Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${escapeIcsText(eventData.title)}`,
    `STATUS:CONFIRMED`,
    `TRANSP:OPAQUE`
  ];
  
  if (eventData.description) {
    icsContent.push(`DESCRIPTION:${escapeIcsText(eventData.description)}`);
  }
  
  if (eventData.location) {
    icsContent.push(`LOCATION:${escapeIcsText(eventData.location)}`);
  }
  
  if (eventData.attendees && eventData.attendees.length > 0) {
    eventData.attendees.forEach(attendee => {
      icsContent.push(`ATTENDEE:MAILTO:${attendee}`);
    });
  }
  
  if (eventData.reminder) {
    icsContent.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${eventData.reminder}M`,
      `DESCRIPTION:${escapeIcsText(eventData.title)}`,
      'END:VALARM'
    );
  }
  
  icsContent.push('END:VEVENT');
  icsContent.push('END:VCALENDAR');
  
  return icsContent.join('\r\n');
}

/**
 * Escape special characters in iCalendar text fields
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Download .ics file with the given event data
 */
export function downloadIcsFile(eventData: CalendarEventData): void {
  const icsContent = generateIcsContent(eventData);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${eventData.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Open Google Calendar with pre-filled event data
 */
export function openGoogleCalendar(eventData: CalendarEventData): void {
  const url = generateGoogleCalendarUrl(eventData);
  chrome.tabs.create({ url });
}
