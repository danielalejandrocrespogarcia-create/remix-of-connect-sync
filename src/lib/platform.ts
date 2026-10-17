/** True when running inside the native Capacitor app (Android/iOS). */
export const isCapacitorApp: boolean =
  import.meta.env.VITE_CAPACITOR === "true" ||
  (typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.());
