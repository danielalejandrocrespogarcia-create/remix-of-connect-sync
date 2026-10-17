import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSchedule, type ScheduleItem } from "@/hooks/useSchedule";

/**
 * Native local notifications (Capacitor) for scheduled class reminders.
 * Works fully offline once notifications are scheduled on the device.
 *
 * - On web (no Capacitor native runtime), this hook is a no-op.
 * - On Android/iOS, it schedules a daily repeating notification 10 minutes
 *   before each class in the user's active section.
 */

const isNative = (): boolean => {
  if (typeof window === "undefined") return false;
  // Capacitor exposes window.Capacitor when running in the native runtime
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.();
};

const idFor = (item: ScheduleItem) => {
  // Stable numeric id derived from uuid (Capacitor requires Int32)
  let h = 0;
  for (let i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483646;
};

const scheduleAll = async (items: ScheduleItem[]) => {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return;
    }

    // Clear previously scheduled to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }

    const notifications = items.flatMap((it) => {
      const [hh, mm] = it.start_time.split(":").map(Number);
      // Notify 10 minutes before
      let nm = mm - 10;
      let nh = hh;
      if (nm < 0) { nm += 60; nh = (nh + 23) % 24; }
      return [{
        id: idFor(it),
        title: `📚 ${it.subject}`,
        body: `Comienza en 10 min · ${it.classroom ?? "Aula"}${it.teacher_name ? ` · ${it.teacher_name}` : ""}`,
        schedule: {
          // Capacitor: weekday is 1=Sunday … 7=Saturday
          // Our day_of_week is 1=Mon … 7=Sun → convert
          on: { weekday: it.day_of_week === 7 ? 1 : it.day_of_week + 1, hour: nh, minute: nm },
          allowWhileIdle: true,
          repeats: true,
        },
      }];
    });

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {
    // silently ignore on web / missing plugin
    console.debug("local-notifications unavailable:", e);
  }
};

export const useLocalNotifications = () => {
  const { user, activeSection } = useAuth();
  const { items } = useSchedule(activeSection ?? "");

  useEffect(() => {
    if (!user || !activeSection || !items.length) return;
    scheduleAll(items);
  }, [user, activeSection, items]);
};
