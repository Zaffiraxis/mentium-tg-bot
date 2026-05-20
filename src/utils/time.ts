import { DateTime } from 'luxon';
import { env, FIXED_LESSON_DURATION_MINUTES } from '../env';

export function nowUtc(): DateTime {
  return DateTime.utc();
}

export function toUserTime(utcDate: DateTime, timezone: string): DateTime {
  return utcDate.setZone(timezone);
}

export function userTimeToUtc(localDate: DateTime, timezone: string): DateTime {
  return localDate.setZone(timezone, { keepLocalTime: true }).toUTC();
}

export function parseStudyTime(studyTime: string, timezone: string): DateTime {
  const [hour, minute] = studyTime.split(':').map(Number);
  return DateTime.now().setZone(timezone).set({ hour, minute, second: 0, millisecond: 0 });
}

export function getLessonEndTime(startUtc: DateTime): DateTime {
  return startUtc.plus({ minutes: FIXED_LESSON_DURATION_MINUTES });
}

export function getReminderTime(
  lessonStartUtc: DateTime,
  offsetMinutes: number
): DateTime {
  return lessonStartUtc.minus({ minutes: offsetMinutes });
}

export function getNextOccurrence(
  studyDays: string[],
  studyTime: string,
  timezone: string
): DateTime | null {
  const dayMap: Record<string, number> = {
    sunday: 7, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  const now = DateTime.now().setZone(timezone);
  const [hour, minute] = studyTime.split(':').map(Number);

  for (let i = 0; i <= 7; i++) {
    const candidate = now.plus({ days: i }).set({ hour, minute, second: 0, millisecond: 0 });
    const weekdayName = candidate.weekdayShort?.toLowerCase() + (candidate.weekday === 1 ? 'onday' :
      candidate.weekday === 2 ? 'uesday' : candidate.weekday === 3 ? 'ednesday' :
      candidate.weekday === 4 ? 'hursday' : candidate.weekday === 5 ? 'riday' :
      candidate.weekday === 6 ? 'aturday' : 'unday');
    const fullName = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][candidate.weekday];
    if (studyDays.includes(fullName) && candidate > now) {
      return candidate.toUTC();
    }
  }
  return null;
}

export function isValidTimeString(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function formatLocalTime(utcDate: DateTime, timezone: string): string {
  return toUserTime(utcDate, timezone).toFormat('HH:mm');
}

export function formatLocalDateTime(utcDate: DateTime, timezone: string): string {
  return toUserTime(utcDate, timezone).toFormat('cccc, MMMM d, HH:mm');
}
