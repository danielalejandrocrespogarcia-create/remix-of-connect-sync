import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Exportar UPT Aragua a Android Studio:
 *   1. bun install
 *   2. bun run build:android   (compila + crea/sincroniza android/)
 *   3. bunx cap open android
 */
const config: CapacitorConfig = {
  appId: "com.uptaragua.campus",
  appName: "UPT Aragua",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
