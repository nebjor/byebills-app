import { Platform } from "react-native";
import type { NotificationRequestInput, TimeIntervalTriggerInput } from "expo-notifications";

const ANDROID_CHANNEL_ID = "billie-reminders";
type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (notificationsModule) return notificationsModule;

  try {
    notificationsModule = await import("expo-notifications");

    // Show notifications even when the app is in the foreground.
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }

    return notificationsModule;
  } catch {
    // Expo Go on Android does not support the native notifications module for this SDK.
    return null;
  }
}

async function ensureAndroidChannel() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Billie reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#7C3AED",
  });
}

/** Ask for notification permission if not already granted. Returns true if allowed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Fire an immediate local notification to confirm things work. */
export async function sendTestNotification(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  const trigger: NotificationRequestInput["trigger"] =
    Platform.OS === "android"
      ? ({
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
          channelId: ANDROID_CHANNEL_ID,
        } as TimeIntervalTriggerInput)
      : null;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Billie here 👋",
      body: "Notifications are on — I'll nudge you about unpaid invoices.",
    },
    trigger,
  });
  return true;
}

/** Schedule a daily reminder to scan receipts. Returns true if scheduled. */
export async function scheduleDailyScanReminder(hour = 20, minute = 0): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  const ok = await ensureNotificationPermission();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Snap your receipts 🧾",
      body: "A quick scan keeps Billie's books tidy.",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
    } as any,
  });
  return true;
}
