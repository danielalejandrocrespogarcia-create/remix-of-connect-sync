import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.a306a400ad994778b7dca0a0d1f73eda",
  appName: "UPT Aragua",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    // Hot-reload from the Lovable sandbox while developing on a device.
    // Remove this `server` block before generating a release APK to bundle the local web assets.
    url: "https://a306a400-ad99-4778-b7dc-a0a0d1f73eda.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
