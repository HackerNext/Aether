import type { CapacitorConfig } from '@capacitor/cli';

// Unique reverse-DNS appId guarantees side-by-side Android installation
// with zero conflicts against any other app on your phone.
const config: CapacitorConfig = {
  appId: 'com.aetheros.biometrics',
  appName: 'AETHER',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#07090D',
  },
  plugins: {
    HealthConnect: {
      enabled: true,
    },
  },
};

export default config;
