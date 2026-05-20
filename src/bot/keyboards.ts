import { Markup } from 'telegraf';
import { env } from '../env';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Day = typeof DAYS[number];

const DAY_LABELS: Record<Day, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function welcomeKeyboard(openMntimUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url('Open Mntim', openMntimUrl)],
    [Markup.button.callback('Discover More', 'DISCOVER_MORE')],
  ]);
}

export function discoverKeyboard(openMntimUrl: string, connectUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url('Open Mntim', openMntimUrl)],
    [Markup.button.url('Connect Account', connectUrl)],
    [Markup.button.callback('← Back', 'BACK_TO_WELCOME')],
  ]);
}

export function inviteScheduleKeyboard(platformUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Set schedule', 'SCHEDULE_START')],
    [Markup.button.url('Open Mntim', platformUrl)],
    [Markup.button.callback('Later', 'MAYBE_LATER')],
  ]);
}

export function inviteReminderKeyboard(platformUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Set reminder', 'SCHEDULE_START')],
    [Markup.button.url('Open Mntim', platformUrl)],
    [Markup.button.callback('Later', 'MAYBE_LATER')],
  ]);
}

export function inviteLessonTimeKeyboard(platformUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Set lesson time', 'SCHEDULE_START')],
    [Markup.button.url('Open Mntim', platformUrl)],
    [Markup.button.callback('Later', 'MAYBE_LATER')],
  ]);
}

export function alreadyLinkedKeyboard(platformUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url('Open Mntim', platformUrl)],
    [Markup.button.callback('Change schedule', 'SCHEDULE_START')],
  ]);
}

export function afterLinkKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Set schedule', 'SCHEDULE_START')],
    [Markup.button.url('Open Mntim', env.PLATFORM_FRONTEND_URL)],
    [Markup.button.callback('Later', 'MAYBE_LATER')],
  ]);
}

export function daysKeyboard(selected: Set<string>) {
  const dayList: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const row1 = dayList.slice(0, 3).map(d =>
    Markup.button.callback(selected.has(d) ? `✅ ${DAY_LABELS[d]}` : DAY_LABELS[d], `DAY_${d.toUpperCase()}`)
  );
  const row2 = dayList.slice(3, 6).map(d =>
    Markup.button.callback(selected.has(d) ? `✅ ${DAY_LABELS[d]}` : DAY_LABELS[d], `DAY_${d.toUpperCase()}`)
  );
  const row3 = [
    Markup.button.callback(selected.has('sunday') ? `✅ Sun` : 'Sun', 'DAY_SUNDAY'),
    Markup.button.callback('Done ✓', 'DAYS_DONE'),
  ];
  return Markup.inlineKeyboard([row1, row2, row3]);
}

export function timeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('08:00', 'TIME_0800'), Markup.button.callback('12:00', 'TIME_1200')],
    [Markup.button.callback('18:00', 'TIME_1800'), Markup.button.callback('20:00', 'TIME_2000')],
    [Markup.button.callback('Enter manually', 'TIME_MANUAL')],
  ]);
}

export function scheduleConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Save schedule ✅', 'SCHEDULE_SAVE')],
    [Markup.button.callback('Edit', 'SCHEDULE_EDIT')],
    [Markup.button.callback('Cancel', 'SCHEDULE_CANCEL')],
  ]);
}

export function rescheduleKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Change days', 'RESCHEDULE_DAYS')],
    [Markup.button.callback('Change time', 'RESCHEDULE_TIME')],
    [Markup.button.callback('Cancel', 'SCHEDULE_CANCEL')],
  ]);
}

export function openPlatformKeyboard(url: string, label: string = 'Open Mntim') {
  return Markup.inlineKeyboard([[Markup.button.url(label, url)]]);
}

export function reminderActionKeyboard(openUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url('Open Mntim', openUrl)],
    [Markup.button.callback('Change time', 'RESCHEDULE_TIME')],
  ]);
}

export function missedLessonKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Study later today', 'MISSED_TODAY')],
    [Markup.button.callback('Move to tomorrow', 'MISSED_TOMORROW')],
    [Markup.button.url('Open Mntim', env.PLATFORM_FRONTEND_URL)],
  ]);
}

export function remindLaterKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('In 15 min', 'REMIND_15')],
    [Markup.button.callback('In 1 hour', 'REMIND_60')],
    [Markup.button.callback('Tomorrow', 'REMIND_TOMORROW')],
  ]);
}

export function connectKeyboard(linkUrl: string) {
  return Markup.inlineKeyboard([[Markup.button.url('Connect account', linkUrl)]]);
}

export function expiredLinkKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('Create new link', 'DO_CONNECT')]]);
}

export function scheduleSavedKeyboard(platformUrl: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url('Open Mntim', platformUrl)],
    [Markup.button.callback('Change time', 'RESCHEDULE_TIME')],
  ]);
}
