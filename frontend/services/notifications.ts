/**
 * Local notification scheduling service using Notifee.
 *
 * All notifications are local trigger-based (TimestampTrigger with DAILY repeat).
 * No server involvement — the backend stores medication data;
 * this service handles OS-level reminders only.
 *
 * Notification ID format: med:<medicationId>:<slot>
 *   e.g. med:a1b2c3d4-...:morning
 */

import notifee, {
    AndroidImportance,
    AndroidVisibility,
    RepeatFrequency,
    TimestampTrigger,
    TriggerType,
} from '@notifee/react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimeSlot = 'morning' | 'afternoon' | 'night';

export interface ReminderConfig {
  medicationId: string;
  medicationName: string;
  dosage: string;
  timing: TimeSlot[];
  withFood?: string;
  /** Override the default clock time for a specific slot */
  customTimes?: Partial<Record<TimeSlot, { hour: number; minute: number }>>;
}

export interface ScheduledReminder {
  notifId: string;
  medicationId: string;
  medicationName: string;
  slot: string;
  time: string;
  timestamp: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const CHANNEL_ID = 'pillmate-reminders';

export const DEFAULT_TIMES: Record<
  TimeSlot,
  { hour: number; minute: number; label: string }
> = {
  morning: { hour: 8, minute: 0, label: '8:00 AM' },
  afternoon: { hour: 14, minute: 0, label: '2:00 PM' },
  night: { hour: 21, minute: 0, label: '9:00 PM' },
};

// ── Internals ─────────────────────────────────────────────────────────────────

async function ensureChannel(): Promise<string> {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Medication Reminders',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
  });
}

function nextOccurrence(hour: number, minute: number): number {
  const now = new Date();
  const t = new Date();
  t.setHours(hour, minute, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime();
}

function makeId(medId: string, slot: string): string {
  return `med:${medId}:${slot}`;
}

function parseId(id: string): { medicationId: string; slot: string } | null {
  if (!id.startsWith('med:')) return null;
  const last = id.lastIndexOf(':');
  if (last <= 4) return null;
  return { medicationId: id.slice(4, last), slot: id.slice(last + 1) };
}

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Request notification permissions. Returns true if granted. */
export async function requestPermissions(): Promise<boolean> {
  const result = await notifee.requestPermission();
  return result.authorizationStatus >= 1;
}

/**
 * Schedule daily repeating reminders for a medication.
 * One notification per timing slot (morning / afternoon / night).
 * Returns the notification IDs that were created.
 */
export async function scheduleReminder(
  config: ReminderConfig,
): Promise<string[]> {
  await requestPermissions();
  const channelId = await ensureChannel();
  const ids: string[] = [];

  for (const slot of config.timing) {
    const time = config.customTimes?.[slot] ?? DEFAULT_TIMES[slot];
    if (!time) continue;

    const id = makeId(config.medicationId, slot);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: nextOccurrence(time.hour, time.minute),
      repeatFrequency: RepeatFrequency.DAILY,
    };

    const bodyParts = [config.dosage, config.withFood].filter(Boolean);

    await notifee.createTriggerNotification(
      {
        id,
        title: `💊 Time for ${config.medicationName}`,
        body: bodyParts.join(' · ') || 'Time to take your medication',
        data: {
          medicationId: config.medicationId,
          medicationName: config.medicationName,
          slot,
        },
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          fullScreenAction: { id: 'default' },
          smallIcon: 'ic_launcher',
        },
      },
      trigger,
    );

    ids.push(id);
  }

  return ids;
}

/** Cancel all reminders for a specific medication. */
export async function cancelReminder(medicationId: string): Promise<void> {
  const all = await notifee.getTriggerNotifications();
  for (const t of all) {
    const p = parseId(t.notification.id ?? '');
    if (p?.medicationId === medicationId) {
      await notifee.cancelNotification(t.notification.id!);
    }
  }
}

/** Cancel a single reminder by its notification ID. */
export async function cancelSingleReminder(id: string): Promise<void> {
  await notifee.cancelNotification(id);
}

/** Get all scheduled medication reminders, sorted by next fire time. */
export async function getScheduledReminders(): Promise<ScheduledReminder[]> {
  const all = await notifee.getTriggerNotifications();
  const reminders: ScheduledReminder[] = [];

  for (const t of all) {
    const p = parseId(t.notification.id ?? '');
    if (!p) continue;

    const ts = (t.trigger as TimestampTrigger).timestamp;
    const d = new Date(ts);

    reminders.push({
      notifId: t.notification.id!,
      medicationId: p.medicationId,
      medicationName:
        (t.notification.data?.medicationName as string) ?? 'Medication',
      slot: p.slot,
      time: formatTime(d.getHours(), d.getMinutes()),
      timestamp: ts,
    });
  }

  return reminders.sort((a, b) => a.timestamp - b.timestamp);
}

/** Cancel every medication reminder. */
export async function cancelAll(): Promise<void> {
  const all = await notifee.getTriggerNotifications();
  for (const t of all) {
    if (t.notification.id?.startsWith('med:')) {
      await notifee.cancelNotification(t.notification.id);
    }
  }
}
