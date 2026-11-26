# AETHER — Biometric Health, Recovery & Performance OS

AETHER unifies adaptive recovery telemetry, logarithmic 0–21 cardiovascular + muscular strain, sleep architecture planning, habit impact correlations, AI coaching, and an offline medical lab vault—engineered for universal wearable compatibility including **Redmi Watch 5 Lite** (Xiaomi Mi Fitness → Android Health Connect), Amazfit (Zepp), Fitbit/Pixel Watch, Samsung Galaxy Watch, Apple Watch, and direct BLE heart-rate straps (`0x180D` / `0x180F`).

## Conflict-Free Standalone Phone Installation (GitHub Pages + Android)

AETHER is isolated at every layer so installing it from GitHub Pages will **never conflict** with any other app hosted on your `<username>.github.io` domain:

1. **Unique PWA Identity (`public/manifest.webmanifest`):**
   - `id`: `"com.aetheros.biometric.pwa.v1"`
   - Relative `scope`: `"./"` and `start_url`: `"./?source=aether_pwa"` so Chrome/Android registers an independent WebAPK scoped strictly to this repository subpath.
2. **Scoped Service Worker (`public/sw.js`):**
   - Registered via `navigator.serviceWorker.register('./sw.js', { scope: './' })` with isolated cache prefix `aether-os-pwa-cache-`.
3. **Namespaced Local Storage (`src/services/storageService.ts`):**
   - All keys are prefixed with `aether_os_v1::`, preventing any cross-repo storage collision on `<username>.github.io`.
4. **Relative Vite Asset Base (`vite.config.ts`):**
   - `base: './'` works on any repository name (e.g., `https://<user>.github.io/aether-os/`).
5. **Unique Native Android Package ID (`capacitor.config.ts`):**
   - `appId: 'com.aetheros.biometrics'` ensures side-by-side APK installs.

## Quick Start & Deploy to GitHub Pages

```bash
npm install
npm run dev      # Local development
npm run build    # Production TypeScript + Vite build
```

### Deploy as a Standalone Phone App via GitHub Pages
1. Create a new GitHub repository (e.g., `aether-os`) and push this folder to `main`.
2. In GitHub repo **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` builds and publishes `https://<your-username>.github.io/aether-os/`.
4. Open that URL on your phone in Chrome (Android) or Safari (iOS) and tap **Add to Home Screen / Install App**—it installs as a separate standalone app icon (**AETHER**) without touching your other GitHub Pages apps.

## Native Android Health Connect Build (Redmi Watch 5 Lite)

```bash
npm run build
npx cap add android
```
Then:
1. Copy `android-native/HealthConnectPlugin.kt` into `android/app/src/main/java/com/aetheros/biometrics/plugins/`.
2. Merge `android-native/AndroidManifest.permissions.xml` into `android/app/src/main/AndroidManifest.xml`.
3. Add `implementation("androidx.health.connect:connect-client:1.1.0-alpha10")` to `android/app/build.gradle`.
4. Run `npx cap open android` and build your APK.
