import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string or Date object into a readable format
 * @param dateInput - ISO date string or Date object
 * @param locale - Locale for formatting (default: 'fr-FR' for Morocco)
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatDate(dateInput: string | Date | null | undefined, locale: string = 'fr-FR'): string {
  if (!dateInput) return '-';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    // Check if date is valid
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Formats a date string with time
 * @param dateInput - ISO date string or Date object
 * @param locale - Locale for formatting (default: 'fr-FR')
 * @returns Formatted date and time string
 */
export function formatDateTime(dateInput: string | Date | null | undefined, locale: string = 'fr-FR'): string {
  if (!dateInput) return '-';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
