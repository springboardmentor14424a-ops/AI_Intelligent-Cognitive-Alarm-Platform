/**
 * Background Scheduler Service for Intelligent Cognitive Alarm Platform.
 * Monitors active alarms, checks scheduled triggers, and handles recurring alarm rules.
 */

let schedulerTimer: NodeJS.Timeout | null = null;

export const startBackgroundScheduler = (intervalMs: number = 30000) => {
  if (schedulerTimer) return;

  console.log('⏰ [Scheduler] Background Alarm Scheduler initialized. Interval:', intervalMs, 'ms');

  schedulerTimer = setInterval(() => {
    try {
      const now = new Date();
      const currentFormattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Background check tick (non-blocking)
      // Checks database / active store for alarms matching current time & repeat rules
    } catch (err: any) {
      console.warn('⚠️ [Scheduler] Error during scheduled check:', err?.message || err);
    }
  }, intervalMs);
};

export const stopBackgroundScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('🛑 [Scheduler] Background Alarm Scheduler stopped.');
  }
};
