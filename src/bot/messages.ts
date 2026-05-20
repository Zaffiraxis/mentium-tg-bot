import { FIXED_LESSON_DURATION_MINUTES } from '../env';
import { UserSummary } from '../services/platformApi';

export const MSG = {
  welcome: () =>
    `Welcome to Mntim 👋\n\n` +
    `I'll help you discover the platform, connect your account, and remind you before your English lessons.`,

  discoverMore:
    `Mntim is an AI English learning platform where you study through real 50-minute lessons with an AI teacher.\n\n` +
    `📹 Product video coming soon.`,

  accountLinked: (name?: string) =>
    `Nice${name ? `, ${name}` : ''}, your Mntim account is connected ✅\n\nWant to set your lesson reminders now?`,

  alreadyLinked: `Your Mntim account is already connected.`,

  linkExpired: `This connection link has expired.\n\nPress /connect to create a new one.`,

  linkInvalid: `This connection link is invalid or already used.\n\nPress /connect to create a new one.`,

  platformVisitedNudge:
    `I saw you opened Mntim 👀\n\n` +
    `Want me to help you set a learning reminder so you don't forget your first lesson?`,

  paidLessonReady:
    `Your paid lesson is ready 🎉\n\nLet's choose when you want to study so I can remind you.`,

  scheduleAskDays: `Which day do you want to study?\n\n_Select at least one day, then press Done._`,

  scheduleNeedAtLeastOneDay: `Please select at least one day before continuing.`,

  scheduleAskTime: `What time should I remind you?\n\n_Use 24-hour format (e.g. 18:30)_`,

  scheduleManualTimePrompt: `Please enter your preferred study time in 24-hour format (e.g. 18:30):`,

  scheduleInvalidTime: `Invalid time format. Please use HH:MM (e.g. 18:00 or 21:30).`,

  scheduleConfirm: (days: string[], time: string) => {
    const dayNames = days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
    return (
      `Great. Your lesson reminder:\n\n` +
      `📅 Days: ${dayNames}\n` +
      `⏰ Time: ${time}\n` +
      `📚 Lesson duration: ${FIXED_LESSON_DURATION_MINUTES} minutes\n\n` +
      `I'll remind you:\n• on the lesson day\n• 1 hour before the lesson`
    );
  },

  schedulesSaved:
    `Done ✅ I'll remind you before your Mntim lesson.`,

  scheduleCancelled: `Schedule setup cancelled. Use /schedule to set it up later.`,

  scheduleNotSet: `You don't have a schedule yet. Use /schedule to set one.`,

  currentSchedule: (days: string[], time: string) => {
    const dayNames = days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
    return `Your current reminder is ${dayNames} at ${time}.`;
  },

  remindersDisabled:
    `Reminders are now disabled.\n\nYou can enable them again anytime with /schedule.`,

  notConnected:
    `Your Telegram is not connected to Mntim yet.\n\nConnect your account to get started.`,

  status: (s: UserSummary, schedule?: { study_time: string; study_days: string[] }) => {
    const nextLesson = schedule
      ? `Next lesson day: ${schedule.study_days[0]} at ${schedule.study_time}`
      : 'No schedule set';
    return (
      `Your Mntim status:\n\n` +
      `👤 Account: connected\n` +
      `💳 Plan: ${s.subscriptionStatus}\n` +
      `📖 Lessons completed: ${s.lessonsCompleted}\n` +
      `🏅 Rank: ${s.rank}\n` +
      `🔥 Streak: ${s.streakDays} days\n` +
      `⏱ ${nextLesson}\n` +
      `📚 Lesson duration: ${FIXED_LESSON_DURATION_MINUTES} minutes`
    );
  },

  nextLesson: `Your next Mntim session is ready.`,

  dayOfLessonReminder: (studyTime: string) =>
    `Today is your Mntim lesson day 📚\n\n` +
    `Your lesson is planned for ${studyTime}.\n` +
    `Duration: ${FIXED_LESSON_DURATION_MINUTES} minutes.`,

  hourBeforeReminder: () =>
    `⏰ Your Mntim lesson starts in 1 hour.\n\n` +
    `Get ready for your ${FIXED_LESSON_DURATION_MINUTES}-minute AI English lesson.`,

  dayBeforeReminder: (topicTitle: string | null, studyTime: string) =>
    `📚 Tomorrow you have a Mntim lesson.\n\n` +
    `Topic: ${topicTitle || 'Continue your learning'}\n` +
    `Time: ${studyTime}\n` +
    `Duration: ${FIXED_LESSON_DURATION_MINUTES} minutes\n\n` +
    `I'll remind you again before it starts.`,

  fifteenMinReminder: () =>
    `Almost time 🚀\n\nYour lesson starts in 15 minutes.\n` +
    `Get ready for your ${FIXED_LESSON_DURATION_MINUTES}-minute AI English lesson.`,

  lessonStartReminder: () =>
    `Your lesson time is now 🚀\n\nReady to continue?`,

  missedLesson:
    `Looks like you missed today's lesson.\n\nNo problem — want to reschedule?`,

  interruptedLesson:
    `Looks like your lesson may have been interrupted.\n\nWant to continue later?`,

  inactivity3Days:
    `You haven't studied for 3 days.\n\nA short return session can help you get back on track.`,

  demoNotCompleted:
    `Your first AI lesson is still waiting.\n\n` +
    `It only takes a few minutes and helps define your English level.`,

  demoCompletedNoPurchase:
    `You finished your first AI lesson 🎉\n\nYour next lessons are unlocked with a learning plan.`,

  activeUser: (book: string | null, section: string | null) =>
    `Ready for your next AI lesson?\n\nYou're currently on:\n${book || 'your current book'} — ${section || 'your current section'}`,

  subscriptionExpired:
    `Your learning plan has expired.\n\nRenew your plan to continue AI lessons and keep your progress moving.`,

  help:
    `/start — welcome & discover Mntim\n` +
    `/connect — link Mntim account\n` +
    `/schedule — set up lesson reminders\n` +
    `/reschedule — change existing schedule\n` +
    `/status — view your current status\n` +
    `/next — get link to next lesson\n` +
    `/stop — disable reminders\n` +
    `/help — show this message`,
};
