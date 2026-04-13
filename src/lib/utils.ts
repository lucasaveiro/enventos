import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a "YYYY-MM-DD" date string as local midnight (not UTC).
 * Avoids the classic timezone bug where `new Date("2024-09-05")` is interpreted
 * as UTC midnight, which in Brazil (UTC-3) becomes September 4 at 21:00.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Convert a Date (or date string) to a "YYYY-MM-DD" string suitable for
 * `<input type="date">` value, using local timezone (not UTC).
 */
export function toDateInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
