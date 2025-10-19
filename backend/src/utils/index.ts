// Timezone utilities

/**
 * Converts a UTC ISO timestamp to local time in YYYY-MM-DD HH:MM:SS format
 * This format is shown to the AI for better personalization
 */
export function formatToLocalTime(utcIsoString: string): string {
  const date = new Date(utcIsoString);
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0') + ' ' +
    String(date.getHours()).padStart(2, '0') + ':' + 
    String(date.getMinutes()).padStart(2, '0') + ':' + 
    String(date.getSeconds()).padStart(2, '0');
}

/**
 * Parses a local time string (YYYY-MM-DD HH:MM:SS) and converts it to UTC ISO format
 * Used when AI passes timestamps back as tool parameters
 */
export function parseLocalTimeToUTC(localTimeString: string): string {
  const [datePart, timePart] = localTimeString.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute, second);
  return localDate.toISOString();
}
