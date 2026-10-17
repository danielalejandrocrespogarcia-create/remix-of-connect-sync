# Project rules

- The `android/` Capacitor platform folder is committed and must ship in exported ZIPs — users run `cap sync` directly and fail with "android platform has not been added" without it.
- Android builds go through `scripts/build-android.mjs` (sets `VITE_CAPACITOR=true`) — keeps the build cross-platform on Windows and enables native-only behavior.
- Use `isCapacitorApp` from `src/lib/platform.ts` to switch to HashRouter and skip service workers/web push in the native app — BrowserRouter and SWs break inside the Android WebView.
- All `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` versions must match — mismatches break `cap sync`.
