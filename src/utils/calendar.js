import { format, isWeekend, addDays as dateFnsAddDays, startOfDay, parseISO } from 'date-fns';

function safeParseDate(d) {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    // Standard JS new Date() treats 'YYYY-MM-DD' as UTC, leading to off-by-one errors.
    // parseISO correctly treats it as local time.
    return parseISO(d);
  }
  return new Date(d);
}

export function isHoliday(date, holidays) {
  if (!holidays || holidays.length === 0) return false;
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.includes(dateStr);
}

export function addWorkingDays(startDate, durationDays, calendarSettings) {
  if (!startDate) return new Date();
  let current = startOfDay(safeParseDate(startDate));
  if (isNaN(current.getTime())) return new Date();

  // Guard against non-finite, NaN, or non-positive durations
  if (!isFinite(durationDays) || isNaN(durationDays) || durationDays <= 0) {
    return current;
  }

  // Safe ceiling to prevent any potential runaway loops (max 50 years = 18250 days)
  const safeDuration = Math.min(durationDays, 18250);
  const { includeWeekends = false, holidays = [] } = calendarSettings || {};

  if (includeWeekends && (!holidays || holidays.length === 0)) {
    return new Date(current.getTime() + safeDuration * 24 * 60 * 60 * 1000);
  }

  const fullDays = Math.floor(safeDuration);
  const remainder = safeDuration - fullDays;
  let daysAdded = 0;
  let maxLoop = fullDays * 4 + 10; // Safety guard against runaway loops
  let loopCount = 0;

  while (daysAdded < fullDays && loopCount++ < maxLoop) {
    current = dateFnsAddDays(current, 1);

    const isWknd = isWeekend(current);
    const isHol = isHoliday(current, holidays);

    if (includeWeekends && !isHol) {
      daysAdded++;
    } else if (!includeWeekends && !isWknd && !isHol) {
      daysAdded++;
    }
  }

  if (remainder > 0) {
    current = new Date(current.getTime() + remainder * 24 * 60 * 60 * 1000);
  }

  return current;
}

export function formatDate(date) {
  if (!date) return '';
  const d = safeParseDate(date);
  if (isNaN(d.getTime())) return '';
  return format(d, 'MMM dd, yyyy');
}
