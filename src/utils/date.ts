/**
 * Calculate days and hours from now until a given date
 * @param targetDate The target date to compare with
 * @returns Object with days and hours remaining
 */
export function getDaysHoursFromNow(targetDate: Date): { days: number; hours: number } {
  const now = new Date()
  const diffMs = targetDate.getTime() - now.getTime() // Difference in milliseconds
  
  // Calculate total hours
  const totalHours = diffMs / (1000 * 60 * 60)
  
  // Calculate days and hours
  const days = Math.floor(totalHours / 24)
  const hours = Math.floor(totalHours % 24)
  
  return { days, hours }
} 